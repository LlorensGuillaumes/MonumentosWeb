import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './NotFound.css';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="notfound">
      <img src="/xxss3.svg" alt="Patrimonio Europeo" className="notfound-emblem" />
      <h1 className="notfound-code">404</h1>
      <h2 className="notfound-title">
        {t('notfound.title', 'Aquesta pàgina no consta al catàleg')}
      </h2>
      <p className="notfound-text">
        {t('notfound.text', "La URL que has visitat no existeix o s'ha mogut. Torna a l'inici i continua explorant el patrimoni.")}
      </p>
      <div className="notfound-actions">
        <Link to="/" className="btn btn-primary btn-lg">
          {t('notfound.home', "Tornar a l'inici")}
        </Link>
        <Link to="/buscar" className="btn btn-secondary btn-lg">
          {t('notfound.search', 'Cercar monuments')}
        </Link>
      </div>
    </div>
  );
}
