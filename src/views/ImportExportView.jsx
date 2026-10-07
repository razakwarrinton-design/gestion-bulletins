import { Upload, FileDown } from 'lucide-react';

const ImportExportView = ({
    classes, selectedClass, setSelectedClass, selectedTrimester, setSelectedTrimester,
    onImportStudents, onImportGrades, onExportGrades, onExportRanking,
}) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold">📂 Import / Export Excel</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
                <Upload className="w-6 h-6 mr-2 text-blue-600" />
                Importer des données
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                    <h4 className="font-bold mb-2">📥 Importer des élèves</h4>
                    <p className="text-sm text-gray-600 mb-4">Format Excel: Colonnes "Nom", "Prénom", "Classe"</p>
                    <input
                        type="file" accept=".xlsx,.xls,.csv" onChange={onImportStudents}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-500 transition-colors">
                    <h4 className="font-bold mb-2">📥 Importer des notes</h4>
                    <p className="text-sm text-gray-600 mb-2">Format Excel: "Nom", "Prénom", puis colonnes des matières</p>
                    <div className="mb-4">
                        <label className="block text-xs font-medium mb-1">Classe:</label>
                        <select
                            value={selectedClass || ''}
                            onChange={(e) => setSelectedClass(e.target.value || null)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg"
                        >
                            <option value="">Sélectionner</option>
                            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                        </select>
                    </div>
                    <input
                        type="file" accept=".xlsx,.xls,.csv" onChange={onImportGrades}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                </div>
            </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
                <FileDown className="w-6 h-6 mr-2 text-green-600" />
                Exporter des données
            </h3>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Classe:</label>
                    <select
                        value={selectedClass || ''}
                        onChange={(e) => setSelectedClass(e.target.value || null)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Sélectionner une classe</option>
                        {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Trimestre:</label>
                    <select value={selectedTrimester} onChange={(e) => setSelectedTrimester(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="1">Trimestre 1</option>
                        <option value="2">Trimestre 2</option>
                        <option value="3">Trimestre 3</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={onExportGrades} disabled={!selectedClass}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg flex items-center justify-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileDown className="w-5 h-5" />
                    <span className="font-medium">Exporter les notes</span>
                </button>
                <button
                    onClick={onExportRanking} disabled={!selectedClass}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-lg flex items-center justify-center space-x-2 hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileDown className="w-5 h-5" />
                    <span className="font-medium">Exporter le classement</span>
                </button>
            </div>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-bold text-blue-800 mb-2">ℹ️ Instructions</h4>
            <ul className="text-sm text-blue-700 space-y-1">
                <li>• Pour importer des élèves : colonnes obligatoires "Nom", "Prénom", "Classe"</li>
                <li>• Pour importer des notes : colonnes "Nom", "Prénom" + une colonne par matière</li>
                <li>• Les exports créent des fichiers Excel prêts à être utilisés ou imprimés</li>
            </ul>
        </div>
    </div>
);

export default ImportExportView;
