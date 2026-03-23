'use client';

import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle } from 'lucide-react';

const STEPS_EN = [
  'Parsing screenplay...',
  'Extracting features...',
  'Analyzing emotions...',
  'Generating beat sheet...',
  'Predicting rating & ROI...',
  'Running coverage analysis...',
  'Analyzing production feasibility...',
  'Identifying tropes & comp films...',
];

const STEPS_KO = [
  '시나리오 파싱 중...',
  '피처 추출 중...',
  '감정 분석 중...',
  '비트 시트 생성 중...',
  '등급 및 ROI 예측 중...',
  '커버리지 분석 중...',
  '제작 타당성 분석 중...',
  '트로프 및 비교 작품 분석 중...',
];

interface AnalysisProgressProps {
  locale?: 'en' | 'ko';
}

export default function AnalysisProgress({ locale = 'en' }: AnalysisProgressProps) {
  const ko = locale === 'ko';
  const steps = ko ? STEPS_KO : STEPS_EN;
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel analysis-progress">
      <h3 className="panel-heading">
        <Loader size={20} className="spin section-icon" />
        {ko ? '시나리오 분석 중...' : 'Analyzing Script...'}
      </h3>
      <div className="progress-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`progress-step ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}
          >
            {i < currentStep ? (
              <CheckCircle size={16} className="progress-step-icon text-success" />
            ) : i === currentStep ? (
              <Loader size={16} className="spin progress-step-icon" />
            ) : (
              <span className="progress-step-dot" />
            )}
            <span>{step}</span>
          </div>
        ))}
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
