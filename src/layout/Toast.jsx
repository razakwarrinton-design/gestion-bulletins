import { CheckCircle } from 'lucide-react';

const Toast = ({ show, message }) => {
    if (!show) return null;
    return (
                <div className="fixed top-4 right-4 z-[100]">
                    <div className="bg-white border border-green-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                        <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-800">{message}</p>
                    </div>
                </div>
    );
};

export default Toast;
