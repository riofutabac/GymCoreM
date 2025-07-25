// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Mail,
  Menu,
  X,
  BarChart2,
  CreditCard,
  Fingerprint,
  Megaphone,
  Package,
  Smartphone,
  Plus
} from 'lucide-react';

/* Swiper carousel */
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

/* Animation variants */
const sectionVariant = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
};

const AnimatedTitle = ({ text, className }: { text: string; className?: string }) => {
  const [mounted, setMounted] = useState(false);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <h2 className={className}>{text}</h2>;
  }

  return (
    <motion.h2
      ref={ref}
      variants={sectionVariant}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {text}
    </motion.h2>
  );
};

/* Recovery token handler */
function RecoveryTokenHandler() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      router.push(`/reset-password${hash}`);
    }
  }, [router]);
  return null;
}

/* Navbar */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = ['Beneficios', 'Galeria', 'Testimonios', 'FAQ'];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md shadow-md' : 'bg-transparent'
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600"
        >
          GymCore
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(link.toLowerCase());
              }}
              className="text-gray-700 hover:text-orange-500 transition-colors duration-300 font-medium"
            >
              {link}
            </a>
          ))}
          <Link href="/register" passHref>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-gray-800 text-white font-bold rounded-full hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300"
            >
              Empieza Gratis
            </motion.button>
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-gray-800 z-50">
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={open ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="overflow-hidden md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200"
      >
        {navLinks.map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase()}`}
            onClick={(e) => {
              e.preventDefault();
              scrollTo(link.toLowerCase());
            }}
            className="block px-8 py-4 text-lg text-gray-700 hover:bg-orange-500/10 border-b border-gray-200 transition-colors"
          >
            {link}
          </a>
        ))}
        <div className="p-6">
          <Link href="/register" passHref>
            <motion.button className="w-full px-6 py-3 bg-gray-800 text-white font-bold rounded-full hover:bg-orange-500 transition-all duration-300">
              Empieza Gratis
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </header>
  );
}

/* Hero */
const Hero = () => {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="home" className="relative flex min-h-screen items-center bg-gray-50 overflow-hidden">
      <div className="absolute inset-0 bg-hero-pattern opacity-50"></div>
      <div className="absolute -bottom-1/3 -left-1/4 w-96 h-96 bg-amber-300 rounded-full blur-3xl opacity-40 animate-blob"></div>
      <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-orange-300 rounded-full blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-6 z-10">
        <div className="md:w-1/2 text-center md:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-4xl md:text-7xl font-extrabold text-gray-900 leading-tight"
          >
            Gestiona tu Gimnasio
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
              Sin Complicaciones
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
            className="mt-6 max-w-xl mx-auto md:mx-0 text-lg text-gray-600"
          >
            Automatiza cobros, controla accesos biometricos y analiza el crecimiento de tu negocio desde un mismo panel.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="mt-10 flex flex-wrap justify-center md:justify-start gap-4"
          >
            <Link href="/register" passHref>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full shadow-lg hover:shadow-orange-500/40 transition-all duration-300"
              >
                Prueba 14 dias Gratis
              </motion.button>
            </Link>
            <button
              onClick={() => scrollTo('beneficios')}
              className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-800 font-bold rounded-full hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300"
            >
              Descubrir Mas
            </button>
          </motion.div>
        </div>
        <motion.div
          className="w-1/2 hidden md:flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src="https://i.ibb.co/nqC4Rpxv/Imagen-de-Whats-App-2025-07-21-a-las-15-42-30-b38bf6f1.jpg"
            alt="Atleta en el gimnasio"
            className="animate-updown w-full max-w-md lg:max-w-lg"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = 'https://placehold.co/500x600/f9fafb/f9fafb?text=GYM';
              img.style.objectFit = 'contain';
            }}
          />
        </motion.div>
      </div>
    </section>
  );
};

/* Benefits */
const benefits = [
  {
    icon: <CreditCard size={32} />,
    title: 'Cobros Automaticos',
    desc: 'Reduce la morosidad al 0% y simplifica tu facturacion.'
  },
  {
    icon: <BarChart2 size={32} />,
    title: 'Reportes en Vivo',
    desc: 'Toma decisiones informadas con datos y metricas clave.'
  },
  {
    icon: <Fingerprint size={32} />,
    title: 'Acceso Biometrico',
    desc: 'Controla el acceso con huella o RFID. Moderno y seguro.'
  },
  {
    icon: <Megaphone size={32} />,
    title: 'Marketing Integrado',
    desc: 'Crea campanas y recupera clientes inactivos facilmente.'
  },
  {
    icon: <Package size={32} />,
    title: 'Inventario POS',
    desc: 'Vende productos y gestiona tu stock sin complicaciones.'
  },
  {
    icon: <Smartphone size={32} />,
    title: 'App para Socios',
    desc: 'Permite reservas, pagos y seguimiento desde el movil.'
  }
];

function Benefits() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="beneficios" className="py-24 bg-white text-gray-800">
      <div ref={ref} className="container mx-auto px-6">
        <AnimatedTitle
          text="Todo en una plataforma"
          className="text-center text-4xl md:text-5xl font-bold text-gray-900"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 max-w-2xl mx-auto text-gray-600 text-center"
        >
          Disenada para gimnasios pequenos y medianos que quieren crecer.
        </motion.p>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2"
            >
              <div className="text-orange-500 mb-4">{b.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900">{b.title}</h3>
              <p className="mt-2 text-gray-600">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Gallery */
const galleryImages = [
  {
    src: 'https://i.ibb.co/tp4gbqZy/dashaboard-Cli.png',
    title: 'Dashaboard Cliente'
  },
  {
    src: 'https://i.ibb.co/zVkd9tMK/dashboard-Manager.png',
    title: 'Dahsboard Manager'
  },
  {
    src: 'https://i.ibb.co/k2NPbBhp/membresia.png',
    title: 'Membresia'
  },
  {
    src: 'https://i.ibb.co/3YQsNcxv/miembros.png',
    title: 'Miembros'
  },
  {
    src: 'https://i.ibb.co/Zz56fcv4/Perfil.png',
    title: 'Perfil'
  },
  {
    src: 'https://i.ibb.co/5W856QM8/pos.png',
    title: 'Punto de Venta'
  }
];

function Gallery() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="galeria" className="py-24 bg-gray-50 text-gray-800">
      <div ref={ref} className="container mx-auto px-6">
        <AnimatedTitle
          text="Asi luce GymCore"
          className="text-center text-4xl md:text-5xl font-bold text-gray-900"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 text-center text-gray-600 max-w-2xl mx-auto"
        >
          Interfaz limpia, modo claro y todo lo que necesitas al alcance.
        </motion.p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((img, i) => (
            <motion.div
              key={img.src}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl shadow-md"
            >
              <img
                src={img.src}
                alt={img.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <motion.div className="absolute bottom-0 left-0 p-6 text-white transform translate-y-10 group-hover:translate-y-0 transition duration-500">
                <h3 className="text-xl font-bold">{img.title}</h3>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Testimonials */
const testimonials = [
  {
    name: 'Carla Rodriguez',
    gym: 'FitZone Lima',
    quote: 'Aumentamos 28% las renovaciones automaticas en tres meses. Increible!',
    img: 'https://placehold.co/100x100/f97316/ffffff?text=CR',
    rating: 5,
    growth: '+28%'
  },
  {
    name: 'Luis Perez',
    gym: 'IronBox Quito',
    quote: 'Ahorro 10 horas semanales en administracion. Todo esta automatizado.',
    img: 'https://placehold.co/100x100/fb923c/ffffff?text=LP',
    rating: 5,
    growth: '-10h/sem'
  },
  {
    name: 'Maria Gomez',
    gym: 'BodyFit CDMX',
    quote: 'Las reservas de clases se dispararon gracias a la app para socios.',
    img: 'https://placehold.co/100x100/fdba74/ffffff?text=MG',
    rating: 5,
    growth: '+45%'
  },
  {
    name: 'Juan David',
    gym: 'Power Gym Bogota',
    quote: 'La mejor inversion que hemos hecho. El soporte tecnico es rapido y eficiente.',
    img: 'https://placehold.co/100x100/f59e0b/ffffff?text=JD',
    rating: 5,
    growth: 'ROI 3x'
  },
  {
    name: 'Ana Sofia',
    gym: 'SportCenter Medellin',
    quote: 'Los reportes automaticos me permiten tomar decisiones mas inteligentes cada dia.',
    img: 'https://placehold.co/100x100/ea580c/ffffff?text=AS',
    rating: 5,
    growth: '+35%'
  },
  {
    name: 'Roberto Martinez',
    gym: 'FitClub Valencia',
    quote: 'Nuestros socios estan mas satisfechos desde que implementamos GymCore.',
    img: 'https://placehold.co/100x100/dc2626/ffffff?text=RM',
    rating: 5,
    growth: '95% satisfaccion'
  }
];

function Testimonials() {
  const [mounted, setMounted] = useState(false);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section id="testimonios" className="py-24 bg-gradient-to-br from-orange-50 via-white to-amber-50 text-gray-800 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-orange-200 to-amber-200 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-orange-300 to-yellow-200 rounded-full blur-3xl opacity-15 translate-x-1/2 translate-y-1/2"></div>
      <div ref={ref} className="container mx-auto px-6 relative z-10">
        <AnimatedTitle text="Historias de Exito" className="text-center text-4xl md:text-5xl font-bold text-gray-900" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 text-center text-gray-600 max-w-2xl mx-auto text-lg"
        >
          Descubre por que mas de 500 gimnasios confian en GymCore
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-8 flex justify-center items-center gap-8 text-center text-sm text-gray-500"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>500+ Gimnasios</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>98% Satisfaccion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span>24/7 Soporte</span>
          </div>
        </motion.div>
        <div className="mt-16">
          {!mounted ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 3).map((t, i) => (
                <div
                  key={i}
                  className="h-full rounded-3xl bg-white/80 backdrop-blur-sm border border-orange-100 p-8 text-center flex flex-col items-center shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    {t.growth}
                  </div>
                  <div className="relative mb-6">
                    <img
                      src={t.img}
                      alt={t.name}
                      className="relative h-24 w-24 rounded-full object-cover shadow-xl ring-4 ring-white"
                    />
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, idx) => (
                      <svg key={idx} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.540 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.380-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="italic text-gray-700 flex-grow text-lg leading-relaxed mb-6 relative z-10">
                    <span className="text-orange-400 text-4xl font-serif absolute -top-2 -left-2 opacity-30">"</span>
                    {t.quote}
                    <span className="text-orange-400 text-4xl font-serif absolute -bottom-4 -right-2 opacity-30">"</span>
                  </blockquote>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{t.name}</h3>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium text-orange-600">{t.gym}</span>
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                pagination={{ clickable: true }}
                loop
                spaceBetween={32}
                slidesPerView={1}
                centeredSlides
                breakpoints={{
                  640: { slidesPerView: 1.2, centeredSlides: true },
                  768: { slidesPerView: 2 },
                  1024: { slidesPerView: 2.5, centeredSlides: true },
                  1280: { slidesPerView: 3 }
                }}
                className="pb-8 testimonials-swiper"
              >
                {testimonials.map((t, idx) => (
                  <SwiperSlide key={idx}>
                    <motion.div
                      whileHover={{ y: -8, scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="h-full rounded-3xl bg-white/80 backdrop-blur-sm border border-orange-100 p-8 text-center flex flex-col items-center shadow-xl hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        {t.growth}
                      </div>
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                        <img
                          src={t.img}
                          alt={t.name}
                          className="relative h-24 w-24 rounded-full object-cover shadow-xl ring-4 ring-white"
                        />
                      </div>
                      <div className="flex gap-1 mb-4">
                        {[...Array(t.rating)].map((_, idx2) => (
                          <motion.svg
                            key={idx2}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.8 + idx2 * 0.1, type: 'spring', stiffness: 200 }}
                            className="w-5 h-5 text-yellow-400 fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </motion.svg>
                        ))}
                      </div>
                      <blockquote className="italic text-gray-700 flex-grow text-lg leading-relaxed mb-6 relative z-10">
                        <span className="text-orange-400 text-4xl font-serif absolute -top-2 -left-2 opacity-30">"</span>
                        {t.quote}
                        <span className="text-orange-400 text-4xl font-serif absolute -bottom-4 -right-2 opacity-30">"</span>
                      </blockquote>
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{t.name}</h3>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-orange-600">{t.gym}</span>
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        </div>
                      </div>
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

/* FAQ */
const faqs = [
  {
    q: 'Necesito conocimientos tecnicos para usar GymCore?',
    a: 'Para nada. GymCore esta disenado para ser intuitivo y facil de usar. Si sabes usar un smartphone o una computadora, puedes gestionar tu gimnasio sin problemas. La interfaz es tan simple que estaras operando en menos de 10 minutos.',
    category: 'Uso'
  },
  {
    q: 'Que tipo de soporte ofrecen?',
    a: 'Ofrecemos soporte completo 24/7 por chat en vivo, correo electronico y telefono. Nuestro equipo de expertos esta listo para ayudarte con cualquier duda, garantizando respuestas en menos de 2 horas. Tambien incluimos capacitacion gratuita para tu equipo.',
    category: 'Soporte'
  },
  {
    q: 'Hay un contrato de permanencia?',
    a: 'No. Puedes elegir un plan mensual o anual y cancelar cuando quieras, sin penalizaciones ni contratos a largo plazo. Creemos en ganarnos tu confianza dia a dia con nuestro servicio.',
    category: 'Precios'
  },
  {
    q: 'La plataforma es segura para los datos de mis clientes?',
    a: 'Absolutamente. Usamos encriptacion de nivel bancario SSL/TLS, seguimos estandares GDPR y realizamos auditorias de seguridad mensuales. Tus datos y los de tus clientes estan mas seguros que en un banco.',
    category: 'Seguridad'
  },
  {
    q: 'Puedo migrar mis datos desde otro sistema?',
    a: 'Si, sin costo adicional. Nuestro equipo especializado te ayudara a migrar todos tus datos: socios, planes, historial de pagos, clases y mas. El proceso toma 24-48 horas y tu gimnasio no para de operar.',
    category: 'Migracion'
  },
  {
    q: 'Funciona con lectores biometricos y control de acceso?',
    a: 'Si, somos compatibles con mas de 15 marcas de lectores biometricos y sistemas de acceso. Desde huellas dactilares hasta tarjetas RFID y codigos QR. La instalacion es gratuita con nuestros tecnicos.',
    category: 'Integracion'
  },
  {
    q: 'Puedo gestionar multiples sucursales?',
    a: 'Por supuesto. Con una sola cuenta puedes gestionar todas tus sucursales, ver reportes consolidados, transferir socios entre gimnasios y mantener el control total de tu cadena desde cualquier lugar.',
    category: 'Multi-sucursal'
  },
  {
    q: 'Que pasa si mi internet se corta?',
    a: 'GymCore funciona tanto online como offline. Si se corta el internet, el sistema sigue registrando accesos, ventas y operaciones. Cuando regresa la conexion, todo se sincroniza automaticamente.',
    category: 'Confiabilidad'
  }
];

function FaqItem({
  item,
  index
}: {
  item: { q: string; a: string; category: string };
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const colors: Record<string, string> = {
    Uso: 'bg-blue-100 text-blue-700',
    Soporte: 'bg-green-100 text-green-700',
    Precios: 'bg-purple-100 text-purple-700',
    Seguridad: 'bg-red-100 text-red-700',
    Migracion: 'bg-yellow-100 text-yellow-700',
    Integracion: 'bg-indigo-100 text-indigo-700',
    'Multi-sucursal': 'bg-pink-100 text-pink-700',
    Confiabilidad: 'bg-emerald-100 text-emerald-700'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl overflow-hidden group transition-all duration-300"
    >
      <motion.button
        layout
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-start text-left py-6 px-8 hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex-1 pr-4">
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${colors[item.category]}`}>
            {item.category}
          </div>
          <span className="font-semibold text-lg text-gray-800 leading-tight block">{item.q}</span>
        </div>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="text-orange-500 flex-shrink-0 ml-2 mt-1">
          <Plus size={24} />
        </motion.div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-6">
              <div className="h-px bg-gradient-to-r from-orange-200 via-orange-300 to-orange-200 mb-4"></div>
              <p className="text-gray-700 leading-relaxed text-base">{item.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FAQ() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const cats = ['Todas', ...Array.from(new Set(faqs.map((f) => f.category)))];
  const filtered = faqs.filter(
    (f) =>
      (category === 'Todas' || f.category === category) &&
      (f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <section id="faq" className="py-24 bg-gradient-to-br from-slate-50 via-white to-orange-50 relative overflow-hidden">
      <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-20"></div>
      <div ref={ref} className="container mx-auto max-w-5xl px-6 relative z-10">
        <AnimatedTitle text="Preguntas Frecuentes" className="text-center text-4xl md:text-5xl font-bold text-gray-900" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 text-center text-gray-600 max-w-3xl mx-auto text-lg"
        >
          Tienes dudas? Aqui resolvemos las preguntas mas comunes de nuestros clientes. Si no encuentras tu respuesta, escribenos y te ayudamos.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-12 mb-8"
        >
          <div className="relative max-w-md mx-auto mb-6">
            <input
              type="text"
              placeholder="Buscar en preguntas frecuentes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-6 py-3 pl-12 rounded-2xl border border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-gray-700 bg-white/80 backdrop-blur-sm"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {cats.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  category === cat
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-white/60 text-gray-600 hover:bg-orange-50 hover:text-orange-600 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>
        <motion.div className="space-y-4" variants={sectionVariant} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
          {filtered.length > 0 ? (
            filtered.map((item, i) => <FaqItem key={i} item={item} index={i} />)
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg">No se encontraron preguntas que coincidan con tu busqueda.</p>
              <p className="text-gray-500 text-sm mt-2">Intenta con otros terminos o selecciona una categoria diferente.</p>
            </motion.div>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 text-center bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 text-white"
        >
          <h3 className="text-2xl font-bold mb-4">No encontraste tu respuesta?</h3>
          <p className="text-orange-100 mb-6 max-w-2xl mx-auto">Nuestro equipo de soporte esta disponible 24/7 para resolver cualquier duda especifica sobre tu gimnasio.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="mailto:soporte@gymcore.com" className="bg-white text-orange-600 px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2">
              <Mail size={20} /> soporte@gymcore.com
            </a>
            <span className="text-orange-200">o</span>
            <Link href="/register" className="bg-orange-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-700 transition-all duration-300">
              Programa una demo gratuita
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* Footer */
const Footer = () => (
  <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: 'radial-gradient(circle,#f97316 1px,transparent 1px)',
        backgroundSize: '30px 30px'
      }}
    ></div>
    <div className="container mx-auto px-6 py-12 relative z-10">
      <div className="grid md:grid-cols-3 gap-8 items-center">
        <div className="text-center md:text-left">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-400 mb-2">
            GymCore
          </div>
          <p className="text-gray-400 text-sm">La plataforma mas completa para gimnasios modernos</p>
        </div>
        <div className="text-center">
          <h4 className="font-semibold text-white mb-3">Enlaces Rapidos</h4>
          <div className="flex flex-col space-y-2 text-sm">
            <a href="#beneficios" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">
              Beneficios
            </a>
            <a href="#testimonios" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">
              Testimonios
            </a>
            <a href="#faq" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">
              Preguntas Frecuentes
            </a>
          </div>
        </div>
        <div className="text-center md:text-right">
          <h4 className="font-semibold text-white mb-3">Contacto</h4>
          <div className="text-sm space-y-2">
            <p className="text-gray-400">soporte@gymcore.com</p>
            <p className="text-gray-400">+1 (555) 123-4567</p>
            <div className="flex justify-center md:justify-end gap-3 mt-4">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors cursor-pointer">
                <span className="text-white text-xs font-bold">F</span>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors cursor-pointer">
                <span className="text-white text-xs font-bold">T</span>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors cursor-pointer">
                <span className="text-white text-xs font-bold">L</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-8"></div>
      <div className="text-center text-sm text-gray-400">
        <p>(c) {new Date().getFullYear()} GymCore. Todos los derechos reservados.</p>
        <p className="mt-2 text-xs">Hecho con amor para revolucionar la gestion de gimnasios</p>
      </div>
    </div>
    <div className="absolute top-4 left-8 w-2 h-2 bg-orange-400 rounded-full opacity-60 animate-pulse"></div>
    <div
      className="absolute bottom-4 right-8 w-1.5 h-1.5 bg-amber-400 rounded-full opacity-50 animate-pulse"
      style={{ animationDelay: '2s' }}
    ></div>
  </footer>
);

export default function HomePage() {
  return (
    <div className="bg-white text-gray-800 scroll-smooth">
      <style jsx global>{`
        .bg-hero-pattern {
          background-image: radial-gradient(#d1d5db 0.5px, transparent 0.5px);
          background-size: 20px 20px;
        }
        .animate-blob {
          animation: blob 8s infinite;
        }
        .animation-delay-2000 {
          animation-delay: -4s;
        }
        @keyframes blob {
          0% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(40px, -60px) scale(1.2);
          }
          66% {
            transform: translate(-30px, 30px) scale(0.8);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }
        .animate-updown {
          animation: updown 4s ease-in-out infinite;
        }
        @keyframes updown {
          0% {
            transform: translateY(-15px);
          }
          50% {
            transform: translateY(15px);
          }
          100% {
            transform: translateY(-15px);
          }
        }
        /* Swiper pagination */
        .testimonials-swiper .swiper-pagination-bullet {
          width: 0.5rem;
          height: 0.5rem;
          background-color: #d1d5db;
          opacity: 1;
        }
        .testimonials-swiper .swiper-pagination-bullet-active {
          background-color: #f97316;
        }
      `}</style>
      <RecoveryTokenHandler />
      <Navbar />
      <main>
        <Hero />
        <Benefits />
        <Gallery />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
