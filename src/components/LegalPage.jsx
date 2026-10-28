import React from 'react';
import { LEGAL, TODO } from '../config/legal';

// Modèles de textes : à faire relire et valider avant mise en service auprès d'un établissement.
// Le texte de loi cité est la loi togolaise n° 2019-014 du 29 octobre 2019 relative à la protection des
// données à caractère personnel (autorité : IPDCP). Adapter si le service est vendu dans un autre pays.

const Todo = ({ children }) => (
  <mark className="bg-yellow-100 text-yellow-900 px-1 rounded">{children || TODO}</mark>
);

const Section = ({ title, children }) => (
  <section className="mt-6">
    <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
    <div className="space-y-2 text-gray-700 leading-relaxed">{children}</div>
  </section>
);

const List = ({ items }) => (
  <ul className="list-disc pl-6 space-y-1">
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
);

function Editor() {
  return (
    <>
      <Todo>{LEGAL.operator || TODO}</Todo>
      {LEGAL.address ? <>, {LEGAL.address}</> : null}
      {LEGAL.email ? <>, <a className="underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></> : null}
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>
        Cette politique explique quelles données EduPulse traite, pourquoi, combien de temps, et comment exercer vos droits.
      </p>

      <Section title="1. Qui est responsable de vos données ?">
        <p>
          L'<strong>établissement scolaire</strong> qui vous a ouvert un compte décide des données saisies et de leur usage :
          il est le responsable du traitement. Le service EduPulse est exploité par <Editor />, qui agit pour son compte
          comme prestataire (sous-traitant).
        </p>
        <p>Pour toute demande, adressez-vous d'abord à la direction de l'établissement.</p>
      </Section>

      <Section title="2. Données traitées">
        <List items={[
          'Élèves : nom, prénom, classe, informations de dossier saisies par l\'établissement, notes, absences, appréciations, rang et moyennes.',
          'Parents et tuteurs : nom, adresse e-mail ou numéro de téléphone, lien avec l\'élève, messages échangés avec l\'établissement.',
          'Personnel (administrateurs, professeurs, secrétaires) : nom, adresse e-mail, rôle, actions importantes (journal d\'audit).',
          'Actualités de l\'établissement : texte publié (frais, règles…) avec le nom et le rôle de la personne qui le publie, visible par les parents concernés.',
          'Avis aux parents (cloche de l\'application et e-mail) : adresse e-mail du parent, prénom de l\'enfant, trimestre ou titre de l\'information publiée. Ces avis ne contiennent ni note ni moyenne.',
          'Techniques : incidents de fonctionnement de l\'application (message d\'erreur, page concernée, identifiant du compte). Ces rapports sont conçus pour ne contenir ni notes ni noms d\'élèves ; un message d\'erreur peut, rarement, reprendre une valeur saisie, et il est supprimé après 30 jours.',
        ]} />
        <p>Les données des élèves, souvent mineurs, ne sont consultables que par les personnes autorisées par l'établissement.</p>
      </Section>

      <Section title="3. Finalités">
        <List items={[
          'Tenir les notes, calculer les moyennes et produire les bulletins.',
          'Permettre aux parents de consulter les résultats de leurs enfants.',
          'Prévenir les parents (notes disponibles, frais et règles de l\'établissement) par la cloche de l\'application et par e-mail.',
          'Sécuriser l\'accès (comptes, double authentification, journal d\'audit) et corriger les incidents.',
        ]} />
        <p>Les données ne sont ni vendues ni utilisées pour de la publicité.</p>
      </Section>

      <Section title="4. Qui y a accès ?">
        <List items={[
          'Les comptes de l\'établissement, selon leur rôle (administrateur, professeur, secrétaire).',
          'Chaque parent : uniquement les données de ses propres enfants.',
          `L'hébergeur des données : ${LEGAL.hosting || TODO}.`,
          'Le service d\'envoi d\'e-mails (Brevo), qui reçoit l\'adresse du parent et le texte de l\'avis pour le lui transmettre, sans note ni moyenne.',
        ]} />
        <p>
          Quand un bulletin est généré avec l'aide de l'intelligence artificielle, seules des informations sans identité de
          l'élève sont envoyées au service concerné.
        </p>
      </Section>

      <Section title="5. Durée de conservation">
        <p>
          Les données sont conservées pendant la scolarité puis pendant la durée fixée par l'établissement : <Todo>durée à
          préciser par l'établissement</Todo>. Cela vaut aussi pour les actualités et les avis aux parents. L'établissement peut
          exporter ou faire supprimer les données à tout moment.
        </p>
      </Section>

      <Section title="6. Vos droits">
        <p>
          Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, ou vous opposer à un traitement,
          en vous adressant à l'établissement ou à <Editor />. En Togo, ces droits découlent de la loi n° 2019-014 du
          29 octobre 2019 relative à la protection des données à caractère personnel ; vous pouvez aussi saisir l'Instance de
          protection des données à caractère personnel (IPDCP).
        </p>
      </Section>

      <Section title="7. Sécurité">
        <List items={[
          'Connexion chiffrée (HTTPS) et mots de passe jamais lisibles par l\'éditeur.',
          'Règles d\'accès dans la base de données : chaque compte ne lit que ce que son rôle permet.',
          'Double authentification (2FA) disponible pour les comptes du personnel.',
          'Journal d\'audit des actions sensibles.',
        ]} />
      </Section>

      <Section title="8. Cookies et stockage local">
        <p>
          EduPulse n'utilise aucun traceur publicitaire ni outil de mesure d'audience. Le navigateur conserve seulement ce
          qui est nécessaire au fonctionnement : session de connexion, préférences d'affichage (mode sombre, langue).
        </p>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <p>En utilisant EduPulse, vous acceptez les conditions suivantes.</p>

      <Section title="1. Le service">
        <p>
          EduPulse aide un établissement scolaire à saisir les notes, calculer les moyennes, éditer les bulletins et
          informer les parents. Le service est exploité par <Editor />.
        </p>
      </Section>

      <Section title="2. Comptes et accès">
        <List items={[
          'Un compte est personnel : ne partagez pas votre mot de passe.',
          'Un nouveau compte reste en attente jusqu\'à sa validation par l\'administrateur de l\'établissement, qui lui attribue un rôle.',
          'Chaque utilisateur n\'accède qu\'aux données prévues pour son rôle.',
        ]} />
      </Section>

      <Section title="3. Responsabilités de l'établissement">
        <List items={[
          'Il est responsable de l\'exactitude des notes et des appréciations qu\'il saisit, et du barème qu\'il choisit.',
          'Il informe les élèves et les parents de l\'usage de leurs données (voir la politique de confidentialité).',
          'Il vérifie chaque bulletin avant de le remettre : le bulletin imprimé engage l\'établissement.',
          'Il est responsable des informations qu\'il publie dans les actualités (frais, règles). Elles sont données à titre d\'information : elles ne constituent ni une facture ni un reçu, et les paiements ne passent pas par le service.',
        ]} />
      </Section>

      <Section title="4. Utilisation acceptable">
        <p>
          Il est interdit d'utiliser le service pour consulter des données sans autorisation, de contourner la sécurité,
          d'y déposer des contenus illicites ou de le perturber.
        </p>
      </Section>

      <Section title="5. Disponibilité et sauvegardes">
        <p>
          L'éditeur met en œuvre des moyens raisonnables pour que le service soit disponible et les données sauvegardées,
          sans garantir une disponibilité permanente. Il est conseillé d'exporter régulièrement les données importantes.
          Les avis envoyés aux parents (cloche, e-mail) sont une aide : leur réception n'est pas garantie (un e-mail peut arriver
          dans les courriers indésirables). L'espace parents reste la référence.
        </p>
      </Section>

      <Section title="6. Fin du service et récupération des données">
        <p>
          À la fin de la relation, l'établissement peut récupérer ses données dans un format exploitable
          (<Todo>délai à préciser</Todo>), après quoi elles sont supprimées.
        </p>
      </Section>

      <Section title="7. Responsabilité">
        <p>
          Dans la limite permise par la loi, l'éditeur n'est pas responsable des erreurs dues à des données mal saisies ni
          des interruptions dues à des services externes. <Todo>Limites de responsabilité, tarifs et loi applicable à
          préciser dans le contrat avec l'établissement.</Todo>
        </p>
      </Section>
    </>
  );
}

const PAGES = {
  confidentialite: { title: 'Politique de confidentialité', Body: Privacy },
  conditions: { title: "Conditions d'utilisation", Body: Terms },
};

/** Page légale publique (accessible sans compte) : `kind` vaut « confidentialite » ou « conditions ». */
export default function LegalPage({ kind }) {
  const { title, Body } = PAGES[kind] ?? PAGES.confidentialite;
  const other = kind === 'conditions' ? 'confidentialite' : 'conditions';
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <article className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-10">
        <a href="#/" className="text-sm text-blue-600 underline">← Retour à l'application</a>
        <h1 className="text-2xl md:text-3xl font-bold mt-4">{title}</h1>
        <p className="mt-3 text-sm bg-yellow-50 border-l-4 border-yellow-400 p-3 text-yellow-900">
          Modèle de texte : à faire relire et valider par l'établissement et l'éditeur avant l'utilisation. Les
          éléments surlignés restent à compléter.
        </p>
        <div className="mt-4 space-y-2 text-gray-700 leading-relaxed"><Body /></div>
        <footer className="mt-10 pt-4 border-t text-sm">
          <a href={`#/${other}`} className="text-blue-600 underline">
            {other === 'conditions' ? "Conditions d'utilisation" : 'Politique de confidentialité'}
          </a>
        </footer>
      </article>
    </main>
  );
}
