'use client';

import React from 'react';
import { generateExportFileName } from '../utils/naming';

interface ReportCoverProps {
  data: any;
  locale?: 'en' | 'ko';
  providers?: Record<string, string>;
}

const TOC_ITEMS = [
  { en: 'Investment Verdict', ko: '투자 판정' },
  { en: 'Financial Viability', ko: '재무 분석' },
  { en: 'Content Quality', ko: '콘텐츠 품질' },
  { en: 'Production Feasibility', ko: '제작 타당성' },
  { en: 'Deep Dive', ko: '상세 분석' },
];

function getVerdictLabel(verdict: string, ko: boolean) {
  if (verdict === 'Recommend') return ko ? '제작 추천' : 'Recommend';
  if (verdict === 'Consider') return ko ? '수정 후 재검토' : 'Consider';
  return ko ? '제작 부적합' : 'Pass';
}

export default function ReportCover({ data, locale = 'en', providers }: ReportCoverProps) {
  const ko = locale === 'ko';
  const castCount = (data.characterNetwork?.characters ?? data.characterNetwork)?.length ?? 0;
  const analysisDate = new Date().toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const verdict = data.coverage?.verdict;
  const providerList = providers ? Object.values(providers).filter((v, i, a) => a.indexOf(v) === i && v !== 'mock') : [];
  const documentId = generateExportFileName(data.scriptId);

  return (
    <div className="report-cover print-only">
      <div className="report-cover-inner">
        <div className="report-cover-top">
          <div className="report-cover-label">{ko ? '대외비' : 'CONFIDENTIAL'}</div>
        </div>

        <div className="report-cover-main">
          <h1 className="report-cover-title">{ko ? '시나리오 인텔리전스\n리포트' : 'Script Intelligence\nReport'}</h1>
          <div className="report-cover-divider" />
          <div className="report-cover-meta">
            <div className="report-cover-meta-item">
              <span className="report-cover-meta-label">{ko ? '문서 ID' : 'Document ID'}</span>
              <span className="report-cover-meta-value">{documentId}</span>
            </div>
            <div className="report-cover-meta-item">
              <span className="report-cover-meta-label">{ko ? '분석 날짜' : 'Analysis Date'}</span>
              <span className="report-cover-meta-value">{analysisDate}</span>
            </div>
            {data.coverage?.title && (
              <div className="report-cover-meta-item">
                <span className="report-cover-meta-label">{ko ? '제목' : 'Title'}</span>
                <span className="report-cover-meta-value">{data.coverage.title}</span>
              </div>
            )}
            {data.coverage?.genre && (
              <div className="report-cover-meta-item">
                <span className="report-cover-meta-label">{ko ? '장르' : 'Genre'}</span>
                <span className="report-cover-meta-value">{data.coverage.genre}</span>
              </div>
            )}
          </div>
        </div>

        <div className="report-cover-stats">
          <div className="report-cover-stat">
            <span className="report-cover-stat-value">{data.summary.predictedRating}</span>
            <span className="report-cover-stat-label">{ko ? '등급' : 'Rating'}</span>
          </div>
          <div className="report-cover-stat">
            <span className="report-cover-stat-value">{data.summary.predictedRoi}</span>
            <span className="report-cover-stat-label">{ko ? 'ROI 티어' : 'ROI Tier'}</span>
          </div>
          <div className="report-cover-stat">
            <span className="report-cover-stat-value">{castCount}</span>
            <span className="report-cover-stat-label">{ko ? '등장인물' : 'Cast Members'}</span>
          </div>
          <div className="report-cover-stat">
            <span className="report-cover-stat-value">{data.features?.sceneCount ?? '—'}</span>
            <span className="report-cover-stat-label">{ko ? '장면 수' : 'Scenes'}</span>
          </div>
        </div>

        {data.coverage?.overallScore != null && (
          <div className="report-cover-score">
            <span className="report-cover-score-number">{data.coverage.overallScore}</span>
            <span className="report-cover-score-suffix">/100</span>
            <span className="report-cover-score-label">{ko ? '종합 커버리지 점수' : 'Overall Coverage Score'}</span>
          </div>
        )}

        {verdict && (
          <div className={`report-cover-verdict report-cover-verdict-${verdict.toLowerCase()}`}>
            {getVerdictLabel(verdict, ko)}
          </div>
        )}

        <div className="report-cover-toc">
          <div className="report-cover-toc-title">{ko ? '목차' : 'Table of Contents'}</div>
          {TOC_ITEMS.map((item, i) => (
            <div key={i} className="report-cover-toc-item">
              <span className="report-cover-toc-number">{i + 1}</span>
              <span className="report-cover-toc-label">{ko ? item.ko : item.en}</span>
            </div>
          ))}
        </div>

        <div className="report-cover-footer">
          <div>{ko ? '시나리오 인텔리전스 플랫폼' : 'Script Intelligence Platform'}</div>
          {providerList.length > 0 && (
            <div>{ko ? 'AI 분석' : 'AI Analysis'}: {providerList.map(p => (p as string).charAt(0).toUpperCase() + (p as string).slice(1)).join(', ')}</div>
          )}
          <div>{ko ? '내부 전용' : 'For internal use only'}</div>
        </div>
      </div>
    </div>
  );
}
