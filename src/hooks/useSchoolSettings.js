import { useSupabaseState } from './useSupabaseState';
import { currentAcademicYear } from '../utils/studentUtils';

// Valeur de départ d'une installation neuve : l'année scolaire en cours (rentrée en septembre)
const DEFAULT_YEAR = currentAcademicYear();
const defaultAcademicYear = () => {
    const start = parseInt(DEFAULT_YEAR, 10);
    return {
        id: 1, year: DEFAULT_YEAR,
        startDate: `${start}-09-01`, endDate: `${start + 1}-06-30`,
        trimesters: [
            { number: 1, startDate: `${start}-09-01`, endDate: `${start}-12-15` },
            { number: 2, startDate: `${start + 1}-01-01`, endDate: `${start + 1}-04-15` },
            { number: 3, startDate: `${start + 1}-04-16`, endDate: `${start + 1}-06-30` },
        ],
        isActive: true, createdAt: new Date().toISOString(),
    };
};

/**
 * Réglages de l'établissement (informations, couleurs, logo, années scolaires) et année en cours.
 * `notify` affiche un message de confirmation après chaque modification.
 */
export function useSchoolSettings({ notify }) {
    const [schoolInfo, setSchoolInfo] = useSupabaseState('schoolInfo', {
        name: 'ÉTABLISSEMENT SCOLAIRE',
        address: 'Adresse de l\'établissement',
        phone: '+33 XXX XXX XXX',
        email: 'contact@ecole.com',
        year: DEFAULT_YEAR,
        // À renseigner dans Paramètres
        republic: '',   // ex: "REPUBLIQUE TOGOLAISE"
        countryMotto: '',   // ex: "Travail · Liberté · Patrie"
        ministry: '',   // ex: "Ministère des Enseignements Primaire et Secondaire"
        devise: '',   // devise de l'école, ex: "L'excellence avant tout"
        directorName: '',   // nom complet du directeur
        principalTeacher: '',   // nom du professeur principal (pour les bulletins)
    });
    const [appColors, setAppColors] = useSupabaseState('appColors', {
        primary: '#2563eb', secondary: '#10b981', accent: '#f59e0b'
    });
    const [academicYears, setAcademicYears, isLoadingYears] = useSupabaseState('academicYears', [defaultAcademicYear()]);
    const [schoolLogo, setSchoolLogo] = useSupabaseState('schoolLogo', null);

    // L'année en cours est l'année marquée « active » : elle est enregistrée avec les années scolaires,
    // donc conservée au rechargement.
    const currentYear = academicYears.find(y => y.isActive)?.year ?? academicYears[0]?.year ?? DEFAULT_YEAR;
    const setCurrentYear = (year) =>
        setAcademicYears(prev => prev.map(y => ({ ...y, isActive: y.year === year })));

    const handleLogoUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setSchoolLogo(e.target.result);
            notify('Logo mis à jour !');
        };
        reader.readAsDataURL(file);
    };

    const updateSchoolInfo = (field, value) => {
        setSchoolInfo({ ...schoolInfo, [field]: value });
        notify('Informations mises à jour !');
    };

    const updateColor = (colorType, value) => {
        setAppColors({ ...appColors, [colorType]: value });
        notify('Couleur mise à jour !');
    };

    return {
        schoolInfo, appColors, schoolLogo,
        academicYears, setAcademicYears, isLoadingYears,
        currentYear, setCurrentYear,
        handleLogoUpload, updateSchoolInfo, updateColor,
    };
}
