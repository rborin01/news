-- W34: Backfill borin_index_tags for all existing processed_news
-- Idempotent: only updates rows where borin_index_tags is empty
-- Uses the same deterministic mapping as the Edge Function

UPDATE processed_news
SET borin_index_tags = CASE category
    WHEN 'Economia & Finanças'          THEN ARRAY['IIR','IREF','IMP','ICD']
    WHEN 'Agronegócio & Commodities'    THEN ARRAY['IIR','IAN']
    WHEN 'Política & STF'               THEN ARRAY['IREF','ICR','IGE','ICN','ICD']
    WHEN 'Negócios & Empreendedorismo'  THEN ARRAY['ICR','IAN','IMP']
    WHEN 'Tecnologia & IA'              THEN ARRAY['IAN','IMP']
    WHEN 'Segurança'                    THEN ARRAY['IGE','ICN','ICD']
    WHEN 'Infraestrutura & Imobiliário' THEN ARRAY['IGE','IREF']
    WHEN 'Liberdade & Censura'          THEN ARRAY['ICN','IGE']
    WHEN 'Saúde & Ciência'              THEN ARRAY['IREF','IAN']
    WHEN 'Energia'                      THEN ARRAY['IIR','IGE']
    WHEN 'Meio Ambiente'                THEN ARRAY['IGE','IAN']
    WHEN 'Geopolítica & Guerra'         THEN ARRAY['IPR','IGE']
    WHEN 'Mercado Financeiro & Forex'   THEN ARRAY['IIR','IMP','ICD']
    WHEN 'Internacional'                THEN ARRAY['IPR']
    WHEN 'Outros'                       THEN ARRAY[]::text[]
    WHEN 'Entretenimento & Cultura'     THEN ARRAY[]::text[]
    WHEN 'Esportes'                     THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
END
WHERE borin_index_tags = '{}' OR borin_index_tags IS NULL;
