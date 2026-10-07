const BulletinTemplatePicker = ({ selected, onSelect, onClose }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full m-4 overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4">
                <h2 className="text-lg font-bold">Choisir le modèle de bulletin</h2>
            </div>
            <div className="p-6 space-y-3">
                {[
                    { id: 'model1', label: '📋 Modèle Classique', desc: 'Format traditionnel avec tableau détaillé' },
                    { id: 'model2', label: '📊 Modèle Moderne', desc: 'Design visuel avec graphiques et barres de progression' },
                    { id: 'model3', label: '🔍 Modèle Complet', desc: 'Analyse avancée avec alertes et détection automatique' },
                ].map(({ id, label, desc }) => (
                    <button key={id} onClick={() => onSelect(id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selected === id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                        <div className="font-semibold">{label}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{desc}</div>
                    </button>
                ))}
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
                <button onClick={() => onClose()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm">
                    Annuler
                </button>
                <button onClick={() => {
                    window.dispatchEvent(new CustomEvent('print-bulletin', { detail: { template: selected } }));
                    setTimeout(() => onClose(), 300);
                }} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm">
                    Imprimer
                </button>
            </div>
        </div>
    </div>
);

export default BulletinTemplatePicker;
