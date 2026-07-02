import * as vscode from 'vscode';

const messages: { [key: string]: { [key: string]: string } } = {
    'en': {
        insufficientCredits: "Insufficient Credits. Deep Audit costs {cost} credits. (Balance: {balance})",
        buyCredits: "Buy Credits",
        configureEmail: "Configure Email",
        emailRequired: "CodeGuard Intelligence requires a License or Credits. Please configure your email.",
        privacyMode: "🔒 Privacy Mode: CodeGuard needs your AI API Key to analyze code securely.",
        scanPlaceholder: "CodeGuard: Please open or click inside a code file to scan."
    },
    'pt-br': {
        insufficientCredits: "Créditos insuficientes. Auditoria Profunda custa {cost} créditos. (Saldo: {balance})",
        buyCredits: "Comprar Créditos",
        configureEmail: "Configurar Email",
        emailRequired: "A Inteligência CodeGuard requer uma Licença ou Créditos. Por favor, configure seu email.",
        privacyMode: "🔒 Modo Privacidade: CodeGuard precisa da sua API Key para analisar o código com segurança.",
        scanPlaceholder: "CodeGuard: Por favor, abra ou clique dentro de um arquivo de código para escanear."
    }
};

export function t(key: string, args?: { [key: string]: string | number }): string {
    const lang = vscode.env.language.toLowerCase();
    const dictionary = messages[lang] || messages['en'];
    let message = dictionary[key] || messages['en'][key] || key;

    if (args) {
        Object.keys(args).forEach(arg => {
            message = message.replace(`{${arg}}`, String(args[arg]));
        });
    }

    return message;
}
