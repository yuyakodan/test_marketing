-- テストマーケティングシステム データベーススキーマ
-- Supabase (PostgreSQL)

-- 拡張機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 組織
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    meta_business_id VARCHAR(50),
    meta_ad_account_id VARCHAR(50),
    meta_pixel_id VARCHAR(50),
    meta_page_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー（Supabase Authと連携）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- プロジェクト（商品/サービス単位）
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_audience JSONB,
    product_info JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- キャンペーン
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    meta_campaign_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(50) NOT NULL,
    daily_budget DECIMAL(10,2),
    lifetime_budget DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    meta_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 広告セット
CREATE TABLE IF NOT EXISTS ad_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    meta_ad_set_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    targeting JSONB NOT NULL DEFAULT '{}',
    optimization_goal VARCHAR(50),
    billing_event VARCHAR(50),
    bid_strategy VARCHAR(50),
    bid_amount DECIMAL(10,2),
    daily_budget DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'draft',
    meta_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- クリエイティブ（バナー）
CREATE TABLE IF NOT EXISTS creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'image',
    format VARCHAR(50),
    image_url TEXT,
    video_url TEXT,
    headline VARCHAR(255),
    description TEXT,
    call_to_action VARCHAR(50),
    generation_prompt TEXT,
    appeal_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft',
    meta_creative_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ランディングページ
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    base_url TEXT NOT NULL,
    appeal_type VARCHAR(100),
    structure_type VARCHAR(100),
    offer_type VARCHAR(100),
    content JSONB,
    meta_tags JSONB,
    conversion_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LPバリアント（A/Bテスト用）
CREATE TABLE IF NOT EXISTS lp_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    variant_code VARCHAR(10) NOT NULL,
    traffic_weight INTEGER DEFAULT 50,
    modifications JSONB,
    is_control BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(landing_page_id, variant_code)
);

-- 広告
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_set_id UUID REFERENCES ad_sets(id) ON DELETE CASCADE,
    creative_id UUID REFERENCES creatives(id),
    meta_ad_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    meta_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 広告×LP組み合わせ（テストマトリクス）
CREATE TABLE IF NOT EXISTS ad_lp_combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
    lp_variant_id UUID REFERENCES lp_variants(id) ON DELETE CASCADE,
    tracking_url TEXT NOT NULL,
    is_winner BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    paused_at TIMESTAMPTZ,
    pause_reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ad_id, lp_variant_id)
);

-- 指標データ（時系列）
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_id UUID REFERENCES ad_lp_combinations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INTEGER,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    link_clicks INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0,
    ctr DECIMAL(8,6),
    cpc DECIMAL(10,2),
    cvr DECIMAL(8,6),
    cpa DECIMAL(10,2),
    roas DECIMAL(8,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(combination_id, date, hour)
);

-- コンバージョンイベント
CREATE TABLE IF NOT EXISTS conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_id UUID REFERENCES ad_lp_combinations(id),
    event_type VARCHAR(50) NOT NULL,
    event_id VARCHAR(100) UNIQUE,
    user_email_hash VARCHAR(64),
    user_phone_hash VARCHAR(64),
    client_ip_address VARCHAR(45),
    client_user_agent TEXT,
    fbp VARCHAR(100),
    fbc VARCHAR(100),
    value DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'JPY',
    content_ids JSONB,
    content_type VARCHAR(50),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    source VARCHAR(20) NOT NULL,
    sent_to_meta BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 最適化ログ
CREATE TABLE IF NOT EXISTS optimization_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    combination_id UUID REFERENCES ad_lp_combinations(id),
    action_type VARCHAR(50) NOT NULL,
    reason TEXT,
    before_state JSONB,
    after_state JSONB,
    statistical_significance DECIMAL(5,4),
    confidence_level DECIMAL(5,4),
    executed_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AIレポート
CREATE TABLE IF NOT EXISTS ai_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    campaign_id UUID REFERENCES campaigns(id),
    report_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    summary TEXT,
    insights JSONB,
    recommendations JSONB,
    next_creative_suggestions JSONB,
    next_lp_suggestions JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_metrics_combination_date ON metrics(combination_id, date);
CREATE INDEX IF NOT EXISTS idx_conversions_combination ON conversions(combination_id);
CREATE INDEX IF NOT EXISTS idx_conversions_event_type ON conversions(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_lp_combinations_active ON ad_lp_combinations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_campaigns_project ON campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_lp_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (基本ポリシー)
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view projects in their organization" ON projects
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view campaigns in their organization" ON campaigns
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON landing_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_creatives_updated_at BEFORE UPDATE ON creatives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
