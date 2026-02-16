import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
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
const Diary = lazy(() => import('./pages/Diary'));
const UserStats = lazy(() => import('./pages/UserStats'));

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
            <Header />
            <main className="main-content">
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/buscar" element={<RequireAuth><Search /></RequireAuth>} />
                  <Route path="/monumento/:id" element={<RequireAuth><Detail /></RequireAuth>} />
                  <Route path="/mapa" element={<RequireAuth><MapPage /></RequireAuth>} />
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
                  <Route path="/contacto" element={<Contact />} />
                </Routes>
              </Suspense>
            </main>
            <footer className="footer">
              <div className="footer-newsletter">
                <NewsletterForm variant="footer" />
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
