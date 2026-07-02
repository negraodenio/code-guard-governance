/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // pdfkit precisa dos .afm font files do node_modules — não pode ser bundlado
    experimental: {
        serverComponentsExternalPackages: ['pdfkit'],
    },
    // Security Headers
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    }
                ],
            },
        ];
    }
};

export default nextConfig;
