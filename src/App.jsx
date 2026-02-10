import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import Home from './pages/Home';
import Search from './pages/Search';
import Detail from './pages/Detail';
import MapPage from './pages/MapPage';
import './App.css';

function App() {
  const { t } = useTranslation();

  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/buscar" element={<Search />} />
              <Route path="/monumento/:id" element={<Detail />} />
              <Route path="/mapa" element={<MapPage />} />
            </Routes>
          </main>
          <footer className="footer">
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
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
