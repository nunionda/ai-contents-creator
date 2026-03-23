import Link from 'next/link';
import {
  BarChart3,
  Users,
  TrendingUp,
  Clapperboard,
  Upload,
  Cpu,
  FileText,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      {/* ─── Hero ─── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <Sparkles size={14} />
          AI-Powered Screenplay Analysis
        </div>
        <h1 className={styles.heroTitle}>Script Intelligence</h1>
        <p className={styles.heroSub}>
          시나리오를 업로드하면 감정 흐름, 캐릭터 관계, 시장성, 제작 예산까지
          AI가 즉시 분석합니다. 할리우드 &amp; 한국 시장 모두 지원.
        </p>
        <Link href="/dashboard" className={styles.heroCta}>
          시나리오 분석 시작하기
        </Link>
        <div className={styles.heroScroll}>
          <span>Scroll</span>
          <ChevronDown size={16} />
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className={styles.features}>
        <p className={styles.sectionLabel}>Features</p>
        <h2 className={styles.sectionTitle}>한 번의 업로드로 모든 분석을</h2>
        <p className={styles.sectionDesc}>
          시나리오 평가에 필요한 핵심 인사이트를 AI가 자동으로 추출합니다.
        </p>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.gold}`}>
              <BarChart3 size={22} />
            </div>
            <h3>감정 흐름 분석</h3>
            <p>
              장면별 감정 점수, 긴장도, 유머 지수를 시각화하여 내러티브
              리듬을 한눈에 파악합니다.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.blue}`}>
              <Users size={22} />
            </div>
            <h3>캐릭터 인텔리전스</h3>
            <p>
              등장인물 비중, 관계 네트워크, 음성 고유성을 분석하여 캐릭터
              밸런스를 평가합니다.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.gold}`}>
              <TrendingUp size={22} />
            </div>
            <h3>ROI 예측</h3>
            <p>
              AI 모델과 통계적 k-NN 분석을 결합하여 흥행 가능성과
              투자 수익률을 예측합니다.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.blue}`}>
              <Clapperboard size={22} />
            </div>
            <h3>제작 분석</h3>
            <p>
              촬영 일수, 로케이션, VFX 복잡도, 예산 범위를 자동으로
              산출하여 제작 계획을 지원합니다.
            </p>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className={styles.howItWorks}>
        <p className={styles.sectionLabel}>How It Works</p>
        <h2 className={styles.sectionTitle}>간단한 3단계</h2>
        <p className={`${styles.sectionDesc}`} style={{ margin: '0 auto' }}>
          복잡한 설정 없이 시나리오 파일만 업로드하세요.
        </p>
        <div className={styles.stepsRow}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepIcon}>
              <Upload size={28} />
            </div>
            <h3>시나리오 업로드</h3>
            <p>PDF, TXT, FDX 등 다양한 포맷의 시나리오 파일을 드래그 앤 드롭</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepIcon}>
              <Cpu size={28} />
            </div>
            <h3>AI 분석</h3>
            <p>감정, 캐릭터, 내러티브 구조, 시장성을 멀티 엔진으로 동시 분석</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepIcon}>
              <FileText size={28} />
            </div>
            <h3>리포트 생성</h3>
            <p>인터랙티브 대시보드와 PDF 리포트로 즉시 결과를 확인</p>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className={styles.stats}>
        <p className={styles.sectionLabel}>By the Numbers</p>
        <h2 className={styles.sectionTitle}>검증된 분석 시스템</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>87%+</div>
            <div className={styles.statLabel}>ROI 예측 정확도</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>15+</div>
            <div className={styles.statLabel}>분석 지표 항목</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>2</div>
            <div className={styles.statLabel}>시장 지원 (KR/US)</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>5+</div>
            <div className={styles.statLabel}>AI 엔진 통합</div>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className={styles.bottomCta}>
        <div className={styles.ctaPanel}>
          <h2>지금 바로 시작하세요</h2>
          <p>
            시나리오 한 편을 업로드하고, AI가 만들어내는 종합 분석 리포트를
            직접 경험해 보세요.
          </p>
          <Link href="/dashboard" className={styles.ctaButton}>
            대시보드로 이동
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className={styles.footer}>
        Script Intelligence &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
