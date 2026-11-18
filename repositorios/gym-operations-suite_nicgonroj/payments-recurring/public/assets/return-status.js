(function () {
  "use strict";
  var root = document.querySelector("[data-reference]");
  if (!root) return;
  var reference = root.getAttribute("data-reference");
  var autoContinueCheckout = root.getAttribute("data-auto-continue") === "true";
  var indicator = document.getElementById("status-indicator");
  var title = document.getElementById("status-title");
  var message = document.getElementById("status-message");
  var retryPayment = document.getElementById("retry-payment");
  var restartPayment = document.getElementById("restart-payment");
  var retryButton = document.getElementById("retry-status");
  var copyReference = document.getElementById("copy-reference");
  var timer = null;
  var inFlight = false;
  var restartInFlight = false;
  var restartMode = "restart_payment";
  var automaticAttempts = 0;
  var maxAutomaticAttempts = 12;
  var retryIdempotencyKey = null;
  var paymentProvider = "mercadopago";
  var checkoutHandoffPrefix = "dgym_checkout_handoff_v1:";
  var checkoutHandoffTtlMilliseconds = 10 * 60 * 1000;
  var activeHandoff = null;
  var handoffNeedsProbe = false;
  var handoffFallbackTimer = null;
  var transitionActive = false;
  var lastResumeRefreshAt = 0;
  var mercadoPagoHosts = [
    "mercadopago.cl",
    "mercadopago.com",
    "mercadopago.com.ar",
    "mercadopago.com.br",
    "mercadopago.com.mx",
    "mercadopago.com.co",
    "mercadopago.com.pe",
    "mercadopago.com.uy"
  ];
  var khipuHosts = ["khipu.com"];

  function setIndicator(text) {
    if (indicator.textContent !== text) indicator.textContent = text;
  }

  function validReference(value) {
    return typeof value === "string" && /^DGYM-[0-9]{8}-[A-F0-9]{32}$/.test(value);
  }

  function trustedCheckoutDestination(value) {
    if (typeof value !== "string") return null;
    try {
      var parsed = new URL(value);
      var hostname = parsed.hostname.toLowerCase();
      var mercadoPago = mercadoPagoHosts.some(function (suffix) {
        return hostname === suffix || hostname.endsWith("." + suffix);
      });
      var provider = mercadoPago ? "mercado_pago" : null;
      return parsed.protocol === "https:"
        && !parsed.username
        && !parsed.password
        && !parsed.port
        && provider
        ? { url: parsed.href, provider: provider }
        : null;
    } catch (error) {
      return null;
    }
  }

  function trustedCheckoutUrl(value) {
    var destination = trustedCheckoutDestination(value);
    return destination ? destination.url : null;
  }

  function trustedKhipuCheckoutUrl(value) {
    if (typeof value !== "string") return null;
    try {
      var parsed = new URL(value);
      var hostname = parsed.hostname.toLowerCase();
      var trustedHost = khipuHosts.some(function (suffix) {
        return hostname === suffix || hostname.endsWith("." + suffix);
      });
      return parsed.protocol === "https:"
        && !parsed.username
        && !parsed.password
        && !parsed.port
        && trustedHost
        ? parsed.href
        : null;
    } catch (error) {
      return null;
    }
  }

  function resolvePaymentProvider(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return "invalid";
    if (!Object.prototype.hasOwnProperty.call(data, "payment_provider") || data.payment_provider === null) return "mercadopago";
    if (data.payment_provider === "mercadopago" || data.payment_provider === "mercado_pago") return "mercadopago";
    if (data.payment_provider === "khipu") return "khipu";
    return "invalid";
  }

  function checkoutHandoffKey() {
    return checkoutHandoffPrefix + reference;
  }

  function clearCheckoutHandoff() {
    activeHandoff = null;
    handoffNeedsProbe = false;
    if (!validReference(reference)) return;
    try {
      window.sessionStorage.removeItem(checkoutHandoffKey());
    } catch (error) {
      // El estado visible igualmente queda cerrado y no conserva un enlace activo.
    }
  }

  function validReadyHandoff(value, now) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.version !== 1 || value.status !== "ready" || value.reference !== reference) return null;
    if (!validReference(value.reference) || value.provider !== "mercado_pago") return null;
    if (!Number.isFinite(value.createdAt) || !Number.isFinite(value.expiresAt)) return null;
    if (value.createdAt > now + 60000 || value.expiresAt <= now || value.expiresAt <= value.createdAt) return null;
    if (value.expiresAt - value.createdAt > checkoutHandoffTtlMilliseconds) return null;
    var destination = trustedCheckoutDestination(value.checkoutUrl);
    if (!destination || destination.provider !== value.provider) return null;
    return {
      version: 1,
      status: "ready",
      reference: value.reference,
      provider: destination.provider,
      checkoutUrl: destination.url,
      createdAt: value.createdAt,
      expiresAt: value.expiresAt
    };
  }

  function loadCheckoutHandoff() {
    if (!validReference(reference)) return null;
    try {
      var raw = window.sessionStorage.getItem(checkoutHandoffKey());
      if (!raw) return null;
      var stored = JSON.parse(raw);
      if (stored && stored.version === 1 && stored.status === "opened" && stored.reference === reference) {
        handoffNeedsProbe = true;
        if (!Number.isFinite(stored.expiresAt) || stored.expiresAt <= Date.now()) {
          window.sessionStorage.removeItem(checkoutHandoffKey());
        }
        return null;
      }
      var ready = validReadyHandoff(stored, Date.now());
      if (!ready) {
        handoffNeedsProbe = true;
        window.sessionStorage.removeItem(checkoutHandoffKey());
      }
      return ready;
    } catch (error) {
      handoffNeedsProbe = true;
      try { window.sessionStorage.removeItem(checkoutHandoffKey()); }
      catch (storageError) { /* No exponer ningún destino si storage no es confiable. */ }
      return null;
    }
  }

  function persistCheckoutHandoff(checkoutUrl) {
    var destination = trustedCheckoutDestination(checkoutUrl);
    if (!validReference(reference) || !destination) return null;
    var now = Date.now();
    var handoff = {
      version: 1,
      status: "ready",
      reference: reference,
      provider: destination.provider,
      checkoutUrl: destination.url,
      createdAt: now,
      expiresAt: now + checkoutHandoffTtlMilliseconds
    };
    var serialized = JSON.stringify(handoff);
    try {
      window.sessionStorage.setItem(checkoutHandoffKey(), serialized);
      if (window.sessionStorage.getItem(checkoutHandoffKey()) !== serialized) return null;
    } catch (error) {
      return null;
    }
    activeHandoff = handoff;
    handoffNeedsProbe = false;
    return handoff;
  }

  function consumeCheckoutHandoff() {
    var handoff = loadCheckoutHandoff();
    if (!handoff) return null;
    var opened = JSON.stringify({
      version: 1,
      status: "opened",
      reference: reference,
      provider: handoff.provider,
      openedAt: Date.now(),
      expiresAt: handoff.expiresAt
    });
    try {
      window.sessionStorage.setItem(checkoutHandoffKey(), opened);
      if (window.sessionStorage.getItem(checkoutHandoffKey()) !== opened) return null;
    } catch (error) {
      return null;
    }
    activeHandoff = null;
    handoffNeedsProbe = true;
    retryPayment.hidden = true;
    retryPayment.removeAttribute("href");
    return handoff;
  }

  function restoreCheckoutHandoff(handoff) {
    if (!handoff || !validReadyHandoff(handoff, Date.now())) return false;
    var serialized = JSON.stringify(handoff);
    try {
      window.sessionStorage.setItem(checkoutHandoffKey(), serialized);
      if (window.sessionStorage.getItem(checkoutHandoffKey()) !== serialized) return false;
    } catch (error) {
      return false;
    }
    activeHandoff = handoff;
    handoffNeedsProbe = false;
    return true;
  }

  function renderCheckoutTransition(handoff, revealButton) {
    transitionActive = true;
    title.textContent = "Te llevamos a Mercado Pago";
    message.textContent = "Tus datos fueron recibidos. Tu inscripción se completará cuando Mercado Pago confirme el pago.";
    retryPayment.textContent = "Continuar a Mercado Pago";
    retryPayment.href = handoff.checkoutUrl;
    retryPayment.hidden = !revealButton;
    retryButton.hidden = true;
    setIndicator(revealButton ? "Continúa con el pago seguro para completar esta inscripción." : "Preparando pago seguro…");
  }

  function showCheckoutFallback(handoff) {
    if (!restoreCheckoutHandoff(handoff)) {
      hideRecoveryActions();
      retryButton.hidden = false;
      setIndicator("No pudimos conservar el enlace seguro. Consulta nuevamente para continuar con esta inscripción.");
      return;
    }
    renderCheckoutTransition(handoff, true);
    setIndicator("No pudimos abrir Mercado Pago automáticamente. Puedes continuar de forma segura.");
  }

  function continueCheckoutHandoff(event) {
    if (event) event.preventDefault();
    var pending = activeHandoff || loadCheckoutHandoff();
    if (!pending) {
      hideRecoveryActions();
      retryButton.hidden = false;
      setIndicator("El enlace seguro ya fue abierto o venció. Consulta el estado para continuar.");
      return;
    }
    var handoff = consumeCheckoutHandoff();
    if (!handoff) {
      hideRecoveryActions();
      retryButton.hidden = false;
      setIndicator("El enlace seguro ya fue abierto o venció. Consulta el estado para continuar.");
      return;
    }
    retryPayment.hidden = true;
    retryPayment.removeAttribute("href");
    setIndicator("Preparando pago seguro…");
    try {
      window.location.assign(handoff.checkoutUrl);
      handoffFallbackTimer = window.setTimeout(function () {
        handoffFallbackTimer = null;
        showCheckoutFallback(handoff);
      }, 1500);
    } catch (error) {
      showCheckoutFallback(handoff);
    }
  }

  function updateRootBusy() {
    root.setAttribute("aria-busy", inFlight || restartInFlight ? "true" : "false");
  }

  function setBusy(busy) {
    inFlight = busy;
    updateRootBusy();
    retryButton.disabled = busy || restartInFlight || !reference;
    retryButton.textContent = busy ? "Consultando…" : "Consultar nuevamente";
  }

  function setRestartBusy(busy) {
    restartInFlight = busy;
    updateRootBusy();
    restartPayment.disabled = busy;
    restartPayment.textContent = busy
      ? (restartMode === "probe_payment" ? "Verificando pago…" : "Preparando nuevo intento…")
      : (restartMode === "probe_payment" ? "Verificar pago y continuar" : "Reintentar con el mismo u otro medio de pago");
    retryButton.disabled = busy || inFlight || !reference;
  }

  function hideRecoveryActions() {
    retryPayment.hidden = true;
    retryPayment.removeAttribute("href");
    restartPayment.hidden = true;
    restartPayment.disabled = false;
  }

  function stopAutomaticPolling() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNext(delay) {
    stopAutomaticPolling();
    if (automaticAttempts >= maxAutomaticAttempts) {
      setIndicator("La confirmación está tardando más de lo habitual. Puedes consultar nuevamente o conservar tu referencia y contactar al gimnasio.");
      return;
    }
    timer = window.setTimeout(function () { checkStatus(true); }, delay);
  }

  function parseJson(response) {
    return response.json().catch(function () { return null; }).then(function (data) {
      return { response: response, data: data };
    });
  }

  function responseJson(response) {
    return parseJson(response).then(function (result) {
      if (!result.response.ok || !result.data || typeof result.data !== "object") {
        var error = new Error("status_request_failed");
        error.httpStatus = result.response.status;
        throw error;
      }
      return result.data;
    });
  }

  function fetchWithTimeout(url, options, timeoutMilliseconds) {
    var controller = typeof window.AbortController === "function" ? new window.AbortController() : null;
    var timeout = window.setTimeout(function () {
      if (controller) controller.abort();
    }, timeoutMilliseconds);
    if (controller) options.signal = controller.signal;
    return fetch(url, options).then(function (response) {
      window.clearTimeout(timeout);
      return response;
    }, function (error) {
      window.clearTimeout(timeout);
      throw error;
    });
  }

  function fetchStatus() {
    return fetchWithTimeout("api/estado.php?ref=" + encodeURIComponent(reference), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store"
    }, 8000).then(responseJson);
  }

  function render(data) {
    transitionActive = false;
    var state = typeof data.state === "string" ? data.state : "unknown";
    var serverMessage = typeof data.message === "string" && data.message.trim() !== ""
      ? data.message
      : "No pudimos interpretar el estado. Conserva tu referencia y contacta al gimnasio.";
    var paymentConfirmed = data.payment_confirmed === true;
    paymentProvider = resolvePaymentProvider(data);
    var manualReview = state === "manual_review";
    var paymentRejected = state === "payment_rejected";
    var checkoutPending = state === "checkout_pending" || state === "payment_pending";
    var recoveryAction = data.recovery_action === "resume_checkout"
      || data.recovery_action === "restart_payment"
      || data.recovery_action === "probe_payment"
      ? data.recovery_action
      : "none";
    var retryCheckoutUrl = recoveryAction === "resume_checkout" && paymentProvider === "mercadopago"
      ? trustedCheckoutUrl(data.retry_checkout_url)
      : null;
    hideRecoveryActions();

    if (paymentConfirmed || manualReview || paymentRejected || paymentProvider !== "mercadopago") {
      clearCheckoutHandoff();
    } else {
      activeHandoff = loadCheckoutHandoff();
      if (!activeHandoff && !handoffNeedsProbe && checkoutPending && retryCheckoutUrl) {
        activeHandoff = persistCheckoutHandoff(retryCheckoutUrl);
      }
    }

    if (manualReview) {
      title.textContent = "Tu inscripción está en revisión";
      setIndicator("El equipo del gimnasio debe revisar el caso antes de iniciar otro pago para esta inscripción o activar la membresía.");
    } else if (paymentConfirmed) {
      title.textContent = "Pago recibido; activación pendiente";
      setIndicator("El pago fue confirmado para esta inscripción. El gimnasio aún debe completar la activación de tu membresía.");
    } else if (paymentRejected) {
      title.textContent = "El pago no fue aprobado";
      if (paymentProvider === "mercadopago" && recoveryAction === "restart_payment") {
        restartMode = "restart_payment";
        restartPayment.textContent = "Reintentar con el mismo u otro medio de pago";
        restartPayment.hidden = false;
        setIndicator("Puedes iniciar un nuevo intento con el mismo u otro medio de pago. Mantendremos esta misma inscripción.");
      } else if (paymentProvider === "khipu") {
        setIndicator("Esta transferencia no se completó y su enlace ya no está vigente. Conserva tu referencia y contacta al gimnasio.");
      } else if (paymentProvider === "invalid") {
        setIndicator("No pudimos identificar el proveedor de pago de esta inscripción. Conserva tu referencia y contacta al gimnasio.");
      } else {
        setIndicator("Conserva tu referencia y contacta al gimnasio antes de iniciar otro pago para esta inscripción.");
      }
    } else if (checkoutPending && paymentProvider === "khipu" && recoveryAction === "probe_payment") {
      title.textContent = "Tu inscripción está guardada";
      restartMode = "probe_payment";
      restartPayment.textContent = "Verificar transferencia y continuar";
      restartPayment.hidden = false;
      setIndicator("Verificaremos tu transferencia en Khipu. Si aún no la haces, podrás continuar con el mismo enlace seguro.");
    } else if (paymentProvider === "invalid") {
      title.textContent = "No pudimos identificar el medio de pago";
      setIndicator("Conserva tu referencia y contacta al gimnasio antes de continuar.");
    } else if (checkoutPending && activeHandoff) {
      renderCheckoutTransition(activeHandoff, true);
    } else if (checkoutPending && (recoveryAction === "probe_payment" || handoffNeedsProbe)) {
      title.textContent = "Tu inscripción está guardada";
      restartMode = "probe_payment";
      restartPayment.textContent = "Verificar pago y continuar";
      restartPayment.hidden = false;
      setIndicator("Verificaremos el pago y la suscripción en Mercado Pago antes de continuar o abrir otro intento para esta inscripción.");
    } else if (state === "payment_pending") {
      title.textContent = "Estamos confirmando tu pago";
      setIndicator("El pago o la autorización está en confirmación. No inicies otro cobro para esta inscripción mientras verificamos el estado.");
    } else {
      title.textContent = "Estamos confirmando tu pago";
      setIndicator("Estado: " + state.replace(/_/g, " "));
    }
    message.textContent = serverMessage;

    return paymentConfirmed || manualReview || paymentRejected;
  }

  function checkStatus(automatic) {
    if (inFlight || restartInFlight || !reference) return;
    stopAutomaticPolling();
    if (automatic) automaticAttempts += 1;
    setBusy(true);
    if (!automatic || automaticAttempts === 1) setIndicator("Consultando el estado seguro…");

    fetchStatus()
      .then(function (data) {
        var terminal = render(data);
        retryButton.hidden = transitionActive;
        setBusy(false);
        if (!terminal) scheduleNext(5000);
      })
      .catch(function (error) {
        retryButton.hidden = false;
        setBusy(false);
        var permanentClientError = error && error.httpStatus >= 400 && error.httpStatus < 500 && error.httpStatus !== 408 && error.httpStatus !== 429;
        setIndicator(permanentClientError
          ? "No pudimos consultar esta referencia. Revísala o contacta al gimnasio."
          : "No pudimos consultar el estado ahora. Conserva tu referencia e inténtalo nuevamente.");
        if (!permanentClientError) scheduleNext(Math.min(15000, 3000 + automaticAttempts * 2000));
      });
  }

  function isUuidV4(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function createUuidV4() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      var generated = window.crypto.randomUUID();
      if (isUuidV4(generated)) return generated.toLowerCase();
    }
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      var hex = Array.prototype.map.call(bytes, function (item) {
        return item.toString(16).padStart(2, "0");
      }).join("");
      return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
    }
    return null;
  }

  function idempotencyKeyForRetry() {
    if (retryIdempotencyKey) return retryIdempotencyKey;
    var storageKey = "dgym-payment-retry:" + reference;
    try {
      var stored = window.sessionStorage.getItem(storageKey);
      if (isUuidV4(stored)) {
        retryIdempotencyKey = stored.toLowerCase();
        return retryIdempotencyKey;
      }
    } catch (error) {
      // El almacenamiento puede estar deshabilitado; la clave vive en memoria.
    }
    retryIdempotencyKey = createUuidV4();
    if (!retryIdempotencyKey) return null;
    try {
      window.sessionStorage.setItem(storageKey, retryIdempotencyKey);
    } catch (error) {
      // Mantener la clave en memoria basta para las fases de esta visita.
    }
    return retryIdempotencyKey;
  }

  function clearRetryIdempotencyKey() {
    var storageKey = "dgym-payment-retry:" + reference;
    retryIdempotencyKey = null;
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch (error) {
      // El checkout ya fue verificado; no bloquear la navegación si storage falla.
    }
  }

  function retryRequest(idempotencyKey) {
    return fetchWithTimeout("api/reintentar-pago.php", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({ reference: reference })
    }, 50000).then(parseJson);
  }

  function performRetryPhase(idempotencyKey, phasesRemaining) {
    return retryRequest(idempotencyKey).then(function (result) {
      var response = result.response;
      var data = result.data;
      var errorCode = data && data.error && typeof data.error.code === "string" ? data.error.code : "";
      var retryMode = data && data.error && typeof data.error.retry_mode === "string" ? data.error.retry_mode : "";
      if (response.status === 409 && errorCode === "retry_busy") {
        var busyError = new Error("retry_busy");
        busyError.code = "retry_busy";
        throw busyError;
      }
      if (response.status === 202 && data && data.next_action === "continue_retry") {
        if (phasesRemaining < 1) {
          var incompleteError = new Error("retry_incomplete");
          incompleteError.code = "retry_incomplete";
          throw incompleteError;
        }
        return performRetryPhase(idempotencyKey, phasesRemaining - 1);
      }
      if ((response.status === 200 || response.status === 201) && data
        && (data.next_action === "mercado_pago" || data.next_action === "khipu")) {
        var responseProvider = data.next_action === "khipu" ? "khipu" : "mercadopago";
        if (responseProvider !== paymentProvider) {
          var mismatchError = new Error("payment_provider_mismatch");
          mismatchError.code = "payment_provider_mismatch";
          throw mismatchError;
        }
        var checkoutUrl = responseProvider === "khipu"
          ? trustedKhipuCheckoutUrl(data.checkout_url)
          : trustedCheckoutUrl(data.checkout_url);
        if (!checkoutUrl) {
          var unsafeError = new Error("unsafe_checkout_url");
          unsafeError.code = "unsafe_checkout_url";
          throw unsafeError;
        }
        return { provider: responseProvider, url: checkoutUrl };
      }
      var requestError = new Error("retry_request_failed");
      requestError.code = errorCode || "retry_request_failed";
      requestError.httpStatus = response.status;
      if (retryMode === "new_idempotency_key"
        || errorCode === "payment_retry_cycle_finished"
        || errorCode === "idempotency_conflict") {
        clearRetryIdempotencyKey();
        requestError.refreshStatus = true;
      }
      if (retryMode === "status_only"
        || errorCode === "payment_retry_review_required"
        || errorCode === "payment_retry_not_allowed") {
        clearRetryIdempotencyKey();
        requestError.refreshStatus = true;
        requestError.terminalStatus = true;
      }
      if (errorCode === "payment_already_received"
        || errorCode === "payment_authorization_pending"
        || errorCode === "payment_confirmation_pending") {
        clearRetryIdempotencyKey();
        requestError.refreshStatus = true;
        requestError.paymentStateChanged = true;
      }
      throw requestError;
    });
  }

  function restartPaymentAttempt() {
    if (restartInFlight || !reference || restartPayment.hidden) return;
    var idempotencyKey = idempotencyKeyForRetry();
    if (!idempotencyKey) {
      setIndicator("Este navegador no pudo preparar un intento seguro. Conserva tu referencia y contacta al gimnasio.");
      return;
    }
    stopAutomaticPolling();
    setRestartBusy(true);
    setIndicator(paymentProvider === "khipu"
      ? "Estamos verificando tu transferencia en Khipu antes de continuar…"
      : restartMode === "probe_payment"
        ? "Estamos verificando el pago y la suscripción antes de continuar…"
        : "Estamos verificando el intento anterior antes de abrir un nuevo pago…");
    performRetryPhase(idempotencyKey, 2)
      .then(function (destination) {
        clearRetryIdempotencyKey();
        if (destination.provider === "khipu") {
          setIndicator("Tu transferencia aún no se ha realizado. Te llevaremos a Khipu para completarla.");
          window.location.assign(destination.url);
          return;
        }
        var handoff = persistCheckoutHandoff(destination.url);
        setRestartBusy(false);
        hideRecoveryActions();
        if (!handoff) {
          setIndicator("El intento quedó preparado, pero este navegador no pudo guardar el enlace seguro. Consulta nuevamente el estado para continuar.");
          return;
        }
        renderCheckoutTransition(handoff, false);
        continueCheckoutHandoff();
      })
      .catch(function (error) {
        setRestartBusy(false);
        if (error && error.code === "retry_busy") {
          setIndicator("Ya hay una actualización de esta inscripción en curso. Espera un momento y vuelve a intentarlo.");
          return;
        }
        if (error && error.paymentStateChanged) {
          hideRecoveryActions();
          setIndicator("Encontramos actividad de pago. Estamos actualizando el estado y no abriremos otro cobro para esta inscripción.");
          checkStatus(false);
          return;
        }
        if (error && error.terminalStatus) {
          hideRecoveryActions();
          setIndicator(error.code === "payment_retry_review_required"
            ? "El gimnasio debe revisar la evidencia antes de iniciar otro pago para esta inscripción."
            : "El estado actual de esta inscripción no permite abrir otro pago. Estamos actualizando la información.");
          checkStatus(false);
          return;
        }
        if (error && (
          error.code === "payment_retry_not_allowed"
          || error.code === "payment_retry_cycle_finished"
          || error.code === "payment_already_received"
          || error.code === "payment_authorization_pending"
          || error.code === "payment_confirmation_pending"
        )) {
          setIndicator("El estado cambió y no podemos abrir otro pago para esta inscripción. Consulta nuevamente antes de continuar.");
          if (error.refreshStatus) checkStatus(false);
          return;
        }
        if (error && error.code === "idempotency_conflict") {
          setIndicator("El intento anterior terminó. Actualizaremos el estado antes de preparar una clave nueva.");
          checkStatus(false);
          return;
        }
        setIndicator("No pudimos preparar otro intento para esta inscripción sin riesgo de duplicarlo. Conserva tu referencia e inténtalo nuevamente.");
      });
  }

  if (!reference) {
    setIndicator("No encontramos una referencia válida. Contacta al gimnasio si completaste el pago.");
    title.textContent = "No pudimos identificar la inscripción";
    root.setAttribute("aria-busy", "false");
    return;
  }

  retryButton.addEventListener("click", function () {
    automaticAttempts = 0;
    checkStatus(false);
  });
  retryPayment.addEventListener("click", continueCheckoutHandoff);
  restartPayment.addEventListener("click", restartPaymentAttempt);
  if (copyReference) {
    copyReference.addEventListener("click", function () {
      if (!validReference(reference)) return;
      var clipboard = window.navigator && window.navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") {
        setIndicator("No pudimos copiar automáticamente. Mantén presionada la referencia para copiarla.");
        return;
      }
      clipboard.writeText(reference).then(function () {
        copyReference.textContent = "Copiada";
        window.setTimeout(function () { copyReference.textContent = "Copiar"; }, 2000);
      }, function () {
        setIndicator("No pudimos copiar automáticamente. Mantén presionada la referencia para copiarla.");
      });
    });
  }
  window.addEventListener("online", function () {
    if (!inFlight && !restartInFlight) {
      automaticAttempts = 0;
      checkStatus(false);
    }
  });
  function refreshAfterProviderReturn() {
    if (document.visibilityState === "hidden" || inFlight || restartInFlight) return;
    var now = Date.now();
    if (now - lastResumeRefreshAt < 1500) return;
    lastResumeRefreshAt = now;
    automaticAttempts = 0;
    checkStatus(false);
  }
  window.addEventListener("focus", refreshAfterProviderReturn);
  document.addEventListener("visibilitychange", refreshAfterProviderReturn);

  activeHandoff = loadCheckoutHandoff();
  if (autoContinueCheckout && activeHandoff) {
    renderCheckoutTransition(activeHandoff, false);
    continueCheckoutHandoff();
  } else {
    checkStatus(true);
  }
}());
