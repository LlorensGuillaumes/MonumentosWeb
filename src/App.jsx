import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import AnalyticsTracker from './components/AnalyticsTracker';
import BackToTop from './components/BackToTop';
import CompareBar from './components/CompareBar';
import CookieConsent from './components/CookieConsent';
import NewsletterForm from './components/NewsletterForm';
import Home from './pages/Home';
import Login from './pages/Login';
import RequireAuth from './components/RequireAuth';
import './App.css';

const Search = lazy(() => import('./pages/Search'));
const Detail = lazy(() => import('./pages/Detail'));
const MapPage = lazy(() => import('./pages/MapPage'));
const Favoritos = lazy(() => import('./pages/Favoritos'));
const Admin = lazy(() => import('./pages/Admin'));
const Contact = lazy(() => import('./pages/Contact'));
const ProposalForm = lazy(() => import('./pages/ProposalForm'));
const MyProposals = lazy(() => import('./pages/MyProposals'));
const RoutePlanner = lazy(() => import('./pages/RoutePlanner'));
const MyRoutes = lazy(() => import('./pages/MyRoutes'));
const Compare = lazy(() => import('./pages/Compare'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Profile = lazy(() => import('./pages/Profile'));
const CuratedRoutes = lazy(() => import('./pages/CuratedRoutes'));
const CuratedRouteDetail = lazy(() => import('./pages/CuratedRouteDetail'));
const CulturalRouteDetail = lazy(() => import('./pages/CulturalRouteDetail'));
const Autores = lazy(() => import('./pages/Autores'));
const Preguntame = lazy(() => import('./pages/Preguntame'));
const Diary = lazy(() => import('./pages/Diary'));
const UserStats = lazy(() => import('./pages/UserStats'));
const NotFound = lazy(() => import('./pages/NotFound'));

function LazyFallback() {
  return <div className="loading" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>...</div>;
}

function App() {
  const { t } = useTranslation();

  return (
    <AppProvider>
      <BrowserRouter>
        <AuthProvider>
          <div className="app">
            <ScrollToTop />
            <AnalyticsTracker />
            <Header />
            <main className="main-content">
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  {/* Contenido público: cualquiera puede explorar el catálogo,
                      las fichas y el mapa sin necesidad de registrarse */}
                  <Route path="/buscar" element={<Search />} />
                  <Route path="/monumento/:id" element={<Detail />} />
                  <Route path="/mapa" element={<MapPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/favoritos" element={<RequireAuth><Favoritos /></RequireAuth>} />
                  <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
                  <Route path="/proponer" element={<RequireAuth><ProposalForm /></RequireAuth>} />
                  <Route path="/mis-propuestas" element={<RequireAuth><MyProposals /></RequireAuth>} />
                  <Route path="/rutas" element={<RequireAuth><RoutePlanner /></RequireAuth>} />
                  <Route path="/mis-rutas" element={<RequireAuth><MyRoutes /></RequireAuth>} />
                  <Route path="/comparar" element={<Compare />} />
                  <Route path="/precios" element={<Pricing />} />
                  <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
                  <Route path="/diario" element={<RequireAuth><Diary /></RequireAuth>} />
                  <Route path="/mis-estadisticas" element={<RequireAuth><UserStats /></RequireAuth>} />
                  <Route path="/rutas-curadas" element={<CuratedRoutes />} />
                  <Route path="/rutas-curadas/:id" element={<CuratedRouteDetail />} />
                  <Route path="/rutas-culturales/:slug" element={<CulturalRouteDetail />} />
                  <Route path="/autores" element={<Autores />} />
                  <Route path="/preguntame" element={<RequireAuth><Preguntame /></RequireAuth>} />
                  <Route path="/contacto" element={<Contact />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <footer className="footer">
              <div className="footer-newsletter">
                <NewsletterForm variant="footer" />
              </div>
              <div className="footer-social">
                <a href="https://www.instagram.com/patrimonioeuropeo" target="_blank" rel="noopener noreferrer" title="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61570752261410" target="_blank" rel="noopener noreferrer" title="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
              <div className="footer-sources">
                <span className="footer-label">{t('footer.dataSources')}</span>
                <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a>
                <a href="https://es.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia ES</a>
                <a href="https://fr.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipédia FR</a>
                <a href="https://ca.wikipedia.org" target="_blank" rel="noopener noreferrer">Viquipedia</a>
                <a href="https://eu.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia EU</a>
                <a href="https://gl.wikipedia.org" target="_blank" rel="noopener noreferrer">Galipedia</a>
                <a href="https://ast.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia AST</a>
                <a href="https://an.wikipedia.org" target="_blank" rel="noopener noreferrer">Biquipedia</a>
                <a href="https://oc.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia OC</a>
                <a href="https://ext.wikipedia.org" target="_blank" rel="noopener noreferrer">Güiquipeya</a>
                <a href="https://pt.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia PT</a>
                <a href="https://lad.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia LAD</a>
                <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
                <a href="https://opendata.aragon.es" target="_blank" rel="noopener noreferrer">Aragón Open Data</a>
                <a href="https://www.sipca.es" target="_blank" rel="noopener noreferrer">SIPCA</a>
                <a href="https://www.iaph.es" target="_blank" rel="noopener noreferrer">IAPH Andalucía</a>
                <a href="https://do.diba.cat" target="_blank" rel="noopener noreferrer">Dip. Barcelona</a>
                <a href="https://icv.gva.es" target="_blank" rel="noopener noreferrer">ICV Valencia</a>
                <a href="https://data.culture.gouv.fr" target="_blank" rel="noopener noreferrer">data.culture.gouv.fr</a>
                <a href="https://www.patrimoniocultural.gov.pt" target="_blank" rel="noopener noreferrer">DGPC Portugal</a>
              </div>
              <p className="footer-privacy">
                {t('footer.privacy')}
              </p>
              <p className="footer-license">
                {t('footer.license')}
              </p>
            </footer>
            <CompareBar />
            <BackToTop />
            <CookieConsent />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
