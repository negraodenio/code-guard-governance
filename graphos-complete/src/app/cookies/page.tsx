import React from 'react';

export default function CookiesPolicy() {
    return (
        <main className="bg-space-black text-slate-100 font-body min-h-screen pt-32 pb-24 selection:bg-neon-lime selection:text-black">
            <div className="max-w-4xl mx-auto px-6">
                <a href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-neon-cyan transition-colors mb-12 text-sm font-bold uppercase tracking-widest font-mono">
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back to Platform
                </a>

                <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-tight font-display text-white">
                    Cookies Policy
                </h1>

                <div className="prose prose-invert prose-lg max-w-none prose-headings:font-display prose-headings:text-white prose-a:text-neon-cyan prose-p:text-slate-300">
                    <p className="text-xl text-slate-400 mb-12">
                        Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 text-white">1. Introduction</h2>
                        <p className="leading-relaxed">
                            CouncilIA ("we", "us", "our") uses cookies and similar tracking technologies on our platform to provide you with the best possible experience. This policy explains what cookies are, how we use them, and your choices regarding their use.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 text-white">2. What are Cookies?</h2>
                        <p className="leading-relaxed mb-4">
                            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently, provide a more personalized experience, and provide analytical data to the site owners.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 text-white">3. How We Use Cookies</h2>
                        <p className="leading-relaxed mb-4">We use different types of cookies for various purposes:</p>
                        <ul className="list-disc pl-6 space-y-3 mt-4 text-slate-300">
                            <li><strong>Essential/Strictly Necessary Cookies:</strong> These cookies are crucial for the basic functioning of the CouncilIA platform. Without them, core features like user authentication and secure routing would not work.</li>
                            <li><strong>Analytical/Performance Cookies:</strong> These help us understand how users interact with our platform by analyzing metrics such as bounce rate, session duration, and feature adoption. This data helps us improve the user experience.</li>
                            <li><strong>Functional Cookies:</strong> These cookies enable the platform to remember your preferences (like language or UI theme) to provide enhanced, personalized functionality.</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 text-white">4. Third-Party Cookies</h2>
                        <p className="leading-relaxed">
                            In addition to our own cookies, we may also use trusted third-party cookies (e.g., Stripe for payments securely embedded in our platform) to report usage statistics and process transactions securely.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 text-white">5. Managing Your Cookies</h2>
                        <p className="leading-relaxed mb-4">
                            You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in your web browser. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer.
                        </p>
                        <div className="p-6 bg-panel-blue/30 border border-neon-cyan/20 rounded-xl mt-6">
                            <p className="font-mono text-sm text-neon-cyan flex items-center gap-3">
                                <span className="material-symbols-outlined">info</span>
                                Note: If you choose to reject cookies, you may still use our platform, but your access to some functionality and areas may be restricted or degraded.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
