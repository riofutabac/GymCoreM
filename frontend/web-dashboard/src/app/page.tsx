/* -------------------------------------------------------------------------- */
/* /app/page.tsx – GymCore Landing (Carrusel, FAQ mejorado, Tema naranja)     */
/* -------------------------------------------------------------------------- */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Mail, Check, Menu, X, ArrowRight, BarChart2, CreditCard, Fingerprint,
  Megaphone, Package, Smartphone, ChevronDown, Plus, Minus
} from 'lucide-react';

/* ---------- Swiper (Historias de Éxito) ---------------------------------- */
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

/* ----------------------------- Animaciones -------------------------------- */
const sectionVariant = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

const AnimatedTitle = ({ text, className }: { text: string; className?: string }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });
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

/* ---------- 0. RecoveryToken handler (se conserva) ------------------------ */
function RecoveryTokenHandler() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) router.push(`/reset-password${hash}`);
  }, [router]);
  return null;
}

/* ---------- 1. Navbar ----------------------------------------------------- */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = ['Beneficios', 'Galería', 'Testimonios', 'FAQ'];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 
      ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-md' : 'bg-transparent'}`}>
      <nav className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">GymCore</Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <a key={link}
              href={`#${link.toLowerCase()}`}
              onClick={e => { e.preventDefault(); scrollToSection(link.toLowerCase()); }}
              className="text-gray-700 hover:text-orange-500 transition-colors duration-300 font-medium">
              {link}
            </a>
          ))}
          <Link href="/register" passHref>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
              className="font-bold text-white bg-gray-800 px-6 py-2 rounded-full hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300">
              Empieza Gratis
            </motion.button>
          </Link>
        </div>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-gray-800 z-50">
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={open ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="overflow-hidden md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200">
        {navLinks.map(link => (
          <a key={link}
            href={`#${link.toLowerCase()}`}
            onClick={e => { e.preventDefault(); scrollToSection(link.toLowerCase()); }}
            className="block px-8 py-4 text-lg text-gray-700 hover:bg-orange-500/10 border-b border-gray-200 transition-colors">
            {link}
          </a>
        ))}
        <div className="p-6">
          <Link href="/register" passHref>
            <motion.button className="w-full font-bold text-white bg-gray-800 px-6 py-3 rounded-full hover:bg-orange-500 transition-all duration-300">
              Empieza Gratis
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </header>
  );
}

/* ---------- 2. Hero ------------------------------------------------------- */
const Hero = () => {
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="home" className="relative flex min-h-screen items-center bg-gray-50 overflow-hidden">
      {/* Spots and noise */}
      <div className="absolute inset-0 bg-hero-pattern opacity-50"></div>
      <div className="absolute -bottom-1/3 -left-1/4 w-96 h-96 bg-amber-300 rounded-full blur-3xl opacity-40 animate-blob"></div>
      <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-orange-300 rounded-full blur-3xl opacity-40 animate-blob animation-delay-2000"></div>

      {/* Content */}
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-6 z-10">
        <div className="md:w-1/2 text-center md:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-4xl md:text-7xl font-extrabold text-gray-900 leading-tight">
            Gestiona tu Gimnasio <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">Sin Complicaciones</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
            className="mt-6 max-w-xl mx-auto md:mx-0 text-lg text-gray-600">
            Automatiza cobros, controla accesos biométricos y analiza el crecimiento de tu negocio desde un mismo panel.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="mt-10 flex flex-wrap justify-center md:justify-start gap-4">
            <Link href="/register" passHref>
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full shadow-lg hover:shadow-orange-500/40 transition-all duration-300">
                Prueba 14 días Gratis
              </motion.button>
            </Link>
            <a href="#beneficios" onClick={e => { e.preventDefault(); scrollToSection('beneficios'); }}>
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-800 font-bold rounded-full hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300">
                Descubrir Más
              </motion.button>
            </a>
          </motion.div>
        </div>

        <motion.div className="w-1/2 hidden md:flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          <img
            src="https://i.ibb.co/nqC4Rpxv/Imagen-de-Whats-App-2025-07-21-a-las-15-42-30-b38bf6f1.jpg"
            alt="Atleta en el gimnasio"
            className="animate-updown w-full max-w-md lg:max-w-lg"
            onError={e => {
              const target = e.currentTarget as HTMLImageElement;
              target.src = 'https://placehold.co/500x600/f9fafb/f9fafb?text=💪';
              target.style.objectFit = 'contain';
            }}
          />
        </motion.div>
      </div>
    </section>
  );
};

/* ---------- 3. Beneficios ------------------------------------------------- */
const benefits = [
  { icon: <CreditCard size={32} />, title: 'Cobros Automáticos', desc: 'Reduce la morosidad al 0 % y simplifica tu facturación.' },
  { icon: <BarChart2 size={32} />, title: 'Reportes en Vivo', desc: 'Toma decisiones informadas con datos y métricas clave.' },
  { icon: <Fingerprint size={32} />, title: 'Acceso Biométrico', desc: 'Controla el acceso con huella o RFID. Moderno y seguro.' },
  { icon: <Megaphone size={32} />, title: 'Marketing Integrado', desc: 'Crea campañas y recupera clientes inactivos fácilmente.' },
  { icon: <Package size={32} />, title: 'Inventario POS', desc: 'Vende productos y gestiona tu stock sin complicaciones.' },
  { icon: <Smartphone size={32} />, title: 'App para Socios', desc: 'Permite reservas, pagos y seguimiento desde el móvil.' },
];

function Benefits() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <section id="beneficios" className="py-24 bg-white text-gray-800">
      <div ref={ref} className="container mx-auto px-6">
        <AnimatedTitle text="Todo en una plataforma" className="text-center text-4xl md:text-5xl font-bold text-gray-900" />
        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 max-w-2xl mx-auto text-gray-600 text-center">
          Diseñada para gimnasios pequeños y medianos que quieren crecer.
        </motion.p>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div key={b.title}
              initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2">
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

/* ---------- 4. Galería ---------------------------------------------------- */
const galleryImages = [
  { src: 'https://images.unsplash.com/photo-1540496905039-512d2f755002?q=80&w=800&auto=format&fit=crop', title: 'Área de Pesas' },
  { src: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=800&auto=format&fit=crop', title: 'Entrenamiento Funcional' },
  { src: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop', title: 'Clases Grupales' },
  { src: 'https://images.unsplash.com/photo-1574680096145-f844349f0409?q=80&w=800&auto=format&fit=crop', title: 'Zona de Cardio' },
  { src: 'https://images.unsplash.com/photo-1554344728-77cf90d922a2?q=80&w=800&auto=format&fit=crop', title: 'Instalaciones Modernas' },
  { src: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop', title: 'Comunidad Activa' },
];

function Gallery() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <section id="galería" className="py-24 bg-gray-50 text-gray-800">
      <div ref={ref} className="container mx-auto px-6">
        <AnimatedTitle text="Así luce GymCore" className="text-center text-4xl md:text-5xl font-bold text-gray-900" />
        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 text-center text-gray-600 max-w-2xl mx-auto">
          Interfaz limpia, modo claro y todo lo que necesitas al alcance.
        </motion.p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((img, i) => (
            <motion.div key={img.src}
              initial={{ opacity: 0, scale: 0.9 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl shadow-md">
              <img src={img.src} alt={img.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
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

/* ---------- 5. Testimonios (Swiper Carousel) ------------------------------ */
const testimonials = [
  { name: 'Carla Rodríguez', gym: 'FitZone Lima', quote: 'Aumentamos 28 % las renovaciones automáticas en tres meses. ¡Increíble!', img: 'https://placehold.co/100x100/f97316/ffffff?text=CR' },
  { name: 'Luis Pérez', gym: 'IronBox Quito', quote: 'Ahorro 10 h semanales en administración. Todo está automatizado.', img: 'https://placehold.co/100x100/fb923c/ffffff?text=LP' },
  { name: 'María Gómez', gym: 'BodyFit CDMX', quote: 'Las reservas de clases se dispararon gracias a la app para socios.', img: 'https://placehold.co/100x100/fdba74/ffffff?text=MG' },
  { name: 'Juan David', gym: 'Power Gym Bogotá', quote: 'La mejor inversión que hemos hecho. El soporte técnico es rápido y eficiente.', img: 'https://placehold.co/100x100/f59e0b/ffffff?text=JD' },
];

function Testimonials() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="testimonios" className="py-24 bg-white text-gray-800 overflow-hidden">
      <div ref={ref} className="container mx-auto px-6">
        <AnimatedTitle text="Historias de Éxito" className="text-center text-4xl md:text-5xl font-bold text-gray-900" />
        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 text-center text-gray-600 max-w-2xl mx-auto">
          Descubre por qué los dueños de gimnasios nos prefieren.
        </motion.p>

        {/* Swiper  */}
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.7, delay: 0.4 }} className="mt-12">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop
            pagination={{ clickable: true }}
            navigation
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{ 768: { slidesPerView: 2 }, 1280: { slidesPerView: 3 } }}
            className="pb-14"
          >
            {testimonials.map((t, i) => (
              <SwiperSlide key={i}>
                <div className="h-full rounded-2xl border border-gray-200 bg-gray-50/60 p-8 text-center flex flex-col items-center shadow-sm">
                  <img src={t.img} alt={t.name} className="mb-6 h-24 w-24 rounded-full object-cover shadow-lg" />
                  <p className="italic text-gray-600 flex-grow">“{t.quote}”</p>
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-900">{t.name}</h3>
                    <span className="text-sm font-medium text-orange-600">{t.gym}</span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- 6. FAQ rediseñado -------------------------------------------- */
const faqs = [
  { q: '¿Necesito conocimientos técnicos para usar GymCore?', a: '¡Para nada! GymCore está diseñado para ser intuitivo y fácil de usar. Si sabes usar un smartphone o una computadora, puedes gestionar tu gimnasio sin problemas.' },
  { q: '¿Qué tipo de soporte ofrecen?', a: 'Ofrecemos soporte completo por chat, correo electrónico y teléfono. Nuestro equipo está listo para ayudarte con cualquier duda, garantizando una respuesta rápida y efectiva.' },
  { q: '¿Hay un contrato de permanencia?', a: 'No. Puedes elegir un plan mensual o anual y cancelar cuando quieras, sin penalizaciones ni contratos a largo plazo.' },
  { q: '¿La plataforma es segura para los datos de mis clientes?', a: 'Absolutamente. Usamos encriptación de nivel bancario y seguimos las mejores prácticas de la industria para proteger toda la información.' },
  { q: '¿Puedo migrar mis datos desde otro sistema?', a: 'Sí. Nuestro equipo te ayudará a migrar tus datos de socios, planes y pagos para que la transición sea lo más fluida posible.' },
];

function FaqItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <motion.button layout onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-left py-5 px-6">
        <span className="font-semibold text-lg text-gray-800">{item.q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} className="text-orange-500">
          {open ? <Minus /> : <Plus />}
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
            className="px-6 pb-6 text-gray-600 leading-relaxed"
          >
            {item.a}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FAQ() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <section id="faq" className="py-24 bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div ref={ref} className="container mx-auto max-w-4xl px-6">
        <AnimatedTitle text="Preguntas Frecuentes" className="text-center text-4xl md:text-5xl font-bold text-gray-900" />
        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-4 text-center text-gray-600 max-w-2xl mx-auto">
          ¿Tienes dudas? Aquí resolvemos las más comunes.
        </motion.p>

        <motion.div className="mt-12 space-y-4" variants={sectionVariant} initial="hidden"
          animate={inView ? 'visible' : 'hidden'}>
          {faqs.map((item, i) => (<FaqItem key={i} item={item} />))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- 7. Footer ----------------------------------------------------- */
const Footer = () => (
  <footer className="bg-white py-8 text-center text-sm text-gray-500 border-t border-gray-200">
    <div className="container mx-auto px-6">
      <p>© {new Date().getFullYear()} GymCore · Todos los derechos reservados</p>
    </div>
  </footer>
);

/* ---------- 8. Página ----------------------------------------------------- */
export default function HomePage() {
  return (
    <div className="bg-white text-gray-800 scroll-smooth">
      {/* Estilos globales para patrones y animaciones */}
      <style jsx global>{`
        .bg-hero-pattern { background-image: radial-gradient(#d1d5db 0.5px, transparent 0.5px); background-size: 20px 20px; }
        .animate-blob { animation: blob 8s infinite; }
        .animation-delay-2000 { animation-delay: -4s; }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.2); }
          66% { transform: translate(-30px, 30px) scale(0.8); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-updown { animation: updown 4s ease-in-out infinite; }
        @keyframes updown { 0% { transform: translateY(-15px); } 50% { transform: translateY(15px); } 100% { transform: translateY(-15px); } }
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
