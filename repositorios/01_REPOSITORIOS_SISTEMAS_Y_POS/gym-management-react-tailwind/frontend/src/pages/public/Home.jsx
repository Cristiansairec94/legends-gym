import { Link } from 'react-router-dom';
import { ArrowRight, Dumbbell, Users, Award, HeartPulse, Check, ShieldCheck } from 'lucide-react';
import SectionTitle, { HeadingBar } from '../../components/common/SectionTitle';
import Slider from '../../components/common/Slider';
import PlanCard from '../../components/cards/PlanCard';
import TrainerCard from '../../components/cards/TrainerCard';
import ProductCard from '../../components/cards/ProductCard';
import ReviewCard from '../../components/cards/ReviewCard';
import Loader from '../../components/common/Loader';
import { useFetch } from '../../hooks/useFetch';
import { useContent } from '../../hooks/useContent';
import { planService } from '../../services/planService';
import { trainerService } from '../../services/trainerService';
import { productService } from '../../services/productService';
import { reviewService } from '../../services/adminService';

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e';

const STATS = [
  { icon: Users, value: '1500+', label: 'Happy Members' },
  { icon: Award, value: '25+', label: 'Expert Trainers' },
  { icon: Dumbbell, value: '10+', label: 'Years Experience' },
  { icon: ShieldCheck, value: '100%', label: 'Satisfaction' },
];

const WHY = [
  'Certified & Expert Trainers',
  'Personalized Workout Plans',
  'Advanced Equipment',
  'Diet & Nutrition Guidance',
  'Friendly Environment',
];

export default function Home() {
  const { content } = useContent();
  const { data: plans } = useFetch(() => planService.list(), []);
  const { data: trainers } = useFetch(() => trainerService.list({ is_active: true }), []);
  const { data: products } = useFetch(() => productService.list({ featured: true, limit: 5 }), []);
  const { data: reviews } = useFetch(() => reviewService.list(), []);

  const heroImage = content.hero_image || DEFAULT_HERO;

  return (
    <div>
      {/* HERO — gym image (changeable from admin panel) over the site's Vanta background */}
      <section className="relative overflow-hidden">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />
        <div className="container-x relative grid min-h-[88vh] items-center gap-8 py-16 lg:grid-cols-2">
          <div className="animate-fade-up">
            <p className="eyebrow">{content.hero_eyebrow || 'Welcome to IBBC'}</p>
            <HeadingBar />
            <h1 className="font-heading text-5xl uppercase leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              {content.hero_title ? content.hero_title : <>Build Your<br /><span className="text-brand">Best Body</span></>}
            </h1>
            <p className="mt-6 max-w-md text-lg text-gray-300">
              {content.hero_subtitle || 'Premium training, expert coaches, and a community built to help you transform.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary px-7 py-3 text-base">Join Now <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/plans" className="btn-outline px-7 py-3 text-base">Explore Plans</Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: Dumbbell, t: 'Modern Equipment' },
                { icon: Users, t: 'Expert Trainers' },
                { icon: HeartPulse, t: 'Diet Guidance' },
                { icon: Award, t: 'Health Tracking' },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/70 p-3 backdrop-blur-sm transition hover:border-brand/50">
                  <f.icon className="h-5 w-5 shrink-0 text-brand" />
                  <span className="text-xs font-medium text-gray-200">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-ink-800 bg-ink-900/70 backdrop-blur-sm">
        <div className="container-x grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="group flex flex-col items-center text-center">
              <s.icon className="h-7 w-7 text-brand transition group-hover:scale-110" />
              <span className="mt-2 font-heading text-3xl text-white">{s.value}</span>
              <span className="text-sm text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT / WHY */}
      <section className="container-x grid items-center gap-10 py-20 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <img src={content.about_image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600'} alt="Gym" className="col-span-2 h-56 w-full rounded-xl object-cover transition duration-500 hover:scale-[1.02]" loading="lazy" />
          <img src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400" alt="Cardio" className="h-40 w-full rounded-xl object-cover transition duration-500 hover:scale-[1.02]" loading="lazy" />
          <div className="grid h-40 place-items-center rounded-xl bg-brand text-center text-white">
            <div><p className="font-heading text-4xl">10+</p><p className="text-sm">Years of Excellence</p></div>
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="About Us" title="We Help You To Build Your Better Body" />
          <p className="mt-4 text-gray-400">{content.about_content || content.about_body || 'International Body Building Club is a premium fitness destination with modern equipment, certified trainers, and tailored programs for every level.'}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {WHY.map((w) => (
              <li key={w} className="flex items-center gap-2 text-sm text-gray-200"><Check className="h-4 w-4 text-brand" />{w}</li>
            ))}
          </ul>
          <Link to="/about" className="btn-primary mt-8">Learn More</Link>
        </div>
      </section>

      {/* PLANS */}
      <section className="bg-ink-900/70 py-20 backdrop-blur-sm">
        <div className="container-x">
          <SectionTitle eyebrow="Membership Plans" title="Choose Your Best Plan" center />
          {!plans ? <Loader /> : !plans.items.length ? (
            <p className="mt-10 text-center text-gray-500">Plans will appear here soon.</p>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {plans.items.slice(0, 5).map((p) => <PlanCard key={p.id} plan={p} />)}
            </div>
          )}
          <div className="mt-10 text-center"><Link to="/plans" className="btn-outline">View All Plans</Link></div>
        </div>
      </section>

      {/* TRAINERS */}
      <section className="container-x py-20">
        <div className="flex items-end justify-between">
          <SectionTitle eyebrow="Our Trainers" title="Meet Our Expert Trainers" />
          <Link to="/trainers" className="btn-outline hidden sm:inline-flex">View All</Link>
        </div>
        {!trainers ? <Loader /> : !trainers.items.length ? (
          <p className="mt-10 text-gray-500">Trainers will appear here soon.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trainers.items.slice(0, 4).map((t) => <TrainerCard key={t.id} trainer={t} />)}
          </div>
        )}
      </section>

      {/* PRODUCTS */}
      <section className="bg-ink-900/70 py-20 backdrop-blur-sm">
        <div className="container-x">
          <div className="flex items-end justify-between">
            <SectionTitle eyebrow="Our Products" title="Premium Supplements" />
            <Link to="/products" className="btn-outline hidden sm:inline-flex">View All</Link>
          </div>
          {!products ? <Loader /> : !products.items.length ? (
            <p className="mt-10 text-gray-500">Products will appear here soon.</p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {products.items.slice(0, 5).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* TESTIMONIALS — slider */}
      <section className="container-x py-20">
        <SectionTitle eyebrow="What Our Members Say" title="Success Stories" center />
        {reviews?.items?.length ? (
          <div className="mt-12">
            <Slider>
              {reviews.items.map((r) => <ReviewCard key={r.id} review={r} />)}
            </Slider>
          </div>
        ) : <p className="mt-8 text-center text-gray-500">Be the first to leave a review.</p>}
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1400" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 to-ink-950/60" />
        <div className="container-x relative flex flex-col items-center gap-6 py-20 text-center">
          <h2 className="font-heading text-4xl uppercase text-white sm:text-5xl">Ready To Transform Your Body?</h2>
          <p className="max-w-lg text-gray-300">Join International Body Building Club today and start your journey.</p>
          <Link to="/register" className="btn-primary px-8 py-3 text-base">Become a Member</Link>
        </div>
      </section>
    </div>
  );
}
