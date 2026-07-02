import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { ScanResult, Violation } from '../report/types';

export interface ReportConfig {
    companyInfo: {
        name: string;
        repository: string;
        framework: string;
        dpo?: {
            name: string;
            email: string;
        };
    };
    template?: 'basic' | 'executive' | 'audit';
    language?: 'pt-BR' | 'en-US';
}

export class CompliancePDFGenerator {
    private doc: any;
    private config: ReportConfig;
    private scanResult: ScanResult;
    private chunks: Buffer[] = [];

    private colors = {
        primary: '#2563eb',
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#ca8a04',
        low: '#16a34a',
        text: '#1f2937',
        textLight: '#6b7280',
        background: '#f9fafb'
    };

    constructor(scanResult: ScanResult, config: ReportConfig) {
        this.scanResult = scanResult;
        this.config = config;

        this.doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Compliance Report - ${config.companyInfo.name}`,
                Author: 'CodeGuard AI',
            }
        });

        this.doc.on('data', (chunk: any) => this.chunks.push(chunk));
    }

    async generate(): Promise<Buffer> {
        // Cover Page
        this.addCoverPage();

        // Executive Summary
        this.addExecutiveSummary();

        // Violations
        this.addViolationsList();

        // Footer on all pages
        this.addFooter();

        this.doc.end();

        return new Promise((resolve) => {
            this.doc.on('end', () => {
                resolve(Buffer.concat(this.chunks));
            });
        });
    }

    private addCoverPage() {
        this.doc
            .fontSize(28)
            .fillColor(this.colors.primary)
            .text('TECHNICAL COMPLIANCE REPORT', { align: 'center' })
            .moveDown();

        this.doc
            .fontSize(16)
            .fillColor(this.colors.text)
            .text(this.config.companyInfo.name, { align: 'center' })
            .moveDown(2);

        this.doc
            .fontSize(12)
            .text(`Repository: ${this.config.companyInfo.repository}`)
            .text(`Framework: ${this.config.companyInfo.framework}`)
            .text(`Date: ${new Date().toLocaleDateString()}`)
            .moveDown(4);

        // Score
        this.doc
            .fontSize(40)
            .fillColor(this.scanResult.grade === 'A' ? this.colors.low : this.colors.critical)
            .text(`Score: ${this.scanResult.score}/100`, { align: 'center' });

        this.doc.addPage();
    }

    private addExecutiveSummary() {
        this.doc
            .fontSize(18)
            .fillColor(this.colors.primary)
            .text('1. Executive Summary')
            .moveDown();

        const { issues } = this.scanResult;

        this.doc
            .fontSize(12)
            .fillColor(this.colors.text)
            .text(`Analysis detected ${issues.critical} critical issues and ${issues.high} high priority issues.`)
            .moveDown();

        this.doc
            .text(`• Critical: ${issues.critical}`)
            .text(`• High: ${issues.high}`)
            .text(`• Medium: ${issues.medium}`)
            .text(`• Low: ${issues.low}`)
            .moveDown(2);
    }

    private addViolationsList() {
        this.doc
            .fontSize(18)
            .fillColor(this.colors.primary)
            .text('2. Critical Violations')
            .moveDown();

        const criticals = this.scanResult.violations.filter((v: any) => v.severity === 'CRITICAL');

        if (criticals.length === 0) {
            this.doc.fontSize(12).fillColor(this.colors.low).text('No critical violations found. Great job!');
        }

        criticals.forEach((v: any, i: number) => {
            this.doc
                .fontSize(12)
                .fillColor(this.colors.critical)
                .text(`[CRITICAL-${i + 1}] ${v.message}`)
                .fontSize(10)
                .fillColor(this.colors.text)
                .text(`File: ${(v as any).file}:${v.line}`)
                .moveDown();
        });
    }

    private addFooter() {
        // Simple footer logic (simplified for prototype)
    }
}
