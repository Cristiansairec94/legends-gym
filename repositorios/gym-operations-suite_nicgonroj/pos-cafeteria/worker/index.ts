/** Cloudflare Worker entry point: Basic Auth by role, then the vinext app router. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  areBasicAuthRolesConfigured,
  authConfigurationError,
  authenticateBasicRole,
  basicAuthChallenge,
  forbiddenRoleResponse,
  hasTrustedMutationOrigin,
  isAdminOnlyApiPath,
  isAdminOnlyPagePath,
  isProfileSwitchPath,
  profileSwitchChallenge,
  profileSwitchRedirect,
  shouldCompleteProfileSwitch,
  untrustedOriginResponse,
  withTrustedAuthRole,
} from "./basic-auth";

interface Env {
  ASSETS: Fetcher;
  BASIC_AUTH_SHA256?: string;
  BASIC_AUTH_SALES_SHA256?: string;
  DB: D1Database;
  WHATSAPP_ENABLED?: string;
  WHATSAPP_GRAPH_API_VERSION?: string;
  WHATSAPP_API_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_WABA_ID?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;
  WHATSAPP_ADMIN_RECIPIENTS?: string;
  WHATSAPP_GROUPS_ENABLED?: string;
  WHATSAPP_GROUP_IDS?: string;
  WHATSAPP_ALERT_TEMPLATE_NAME?: string;
  WHATSAPP_REMINDER_TEMPLATE_NAME?: string;
  WHATSAPP_DAILY_TEMPLATE_NAME?: string;
  WHATSAPP_TEMPLATE_LANGUAGE?: string;
  WHATSAPP_UTILITY_TTL_SECONDS?: string;
  WHATSAPP_MAX_RETRIES?: string;
  APP_PUBLIC_URL?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
  noRetry(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/webhooks/whatsapp") {
      return handler.fetch(request, env, ctx);
    }
    if (
      !areBasicAuthRolesConfigured(
        env.BASIC_AUTH_SHA256,
        env.BASIC_AUTH_SALES_SHA256,
      )
    ) {
      return authConfigurationError();
    }
    if (isProfileSwitchPath(url.pathname) && !shouldCompleteProfileSwitch(request)) {
      return profileSwitchChallenge();
    }
    const role = await authenticateBasicRole(
      request,
      env.BASIC_AUTH_SHA256,
      env.BASIC_AUTH_SALES_SHA256,
    );
    if (!role) {
      return basicAuthChallenge();
    }
    if (isProfileSwitchPath(url.pathname)) {
      return profileSwitchRedirect(request);
    }
    if (!hasTrustedMutationOrigin(request)) {
      return untrustedOriginResponse();
    }

    if (
      role === "sales" &&
      (isAdminOnlyApiPath(url.pathname) || isAdminOnlyPagePath(url.pathname))
    ) {
      return forbiddenRoleResponse();
    }

    const authenticatedRequest = withTrustedAuthRole(request, role);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(authenticatedRequest, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, authenticatedRequest.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(authenticatedRequest, env, ctx);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const internalUrl = "https://scheduler.demogymcafe.invalid";
    const request = withTrustedAuthRole(
      new Request(`${internalUrl}/api/closure-incidents/notifications/process`, {
        method: "POST",
        headers: { Origin: internalUrl },
      }),
      "admin",
    );
    ctx.waitUntil(
      handler.fetch(request, env, ctx).then((response) => {
        if (!response.ok) {
          throw new Error(
            `Notification policy processing failed with status ${response.status}.`,
          );
        }
      }),
    );
  },
};

export default worker;
