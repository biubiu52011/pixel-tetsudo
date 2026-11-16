-- PNG-first intervals may omit fleet and investigation-source fields.
-- Legacy numbered-service evidence and roster rows are preserved.
ALTER TABLE public.published_train_png_number_ranges
  ALTER COLUMN source_url DROP NOT NULL,
  ALTER COLUMN vehicle_model DROP NOT NULL;

ALTER TABLE public.published_train_png_number_ranges
  ADD CONSTRAINT published_train_png_valid_band_bounds
    CHECK (min_number >= 0 AND max_number >= min_number);

ALTER TABLE public.published_train_png_number_ranges
  ADD CONSTRAINT published_train_png_unproven_band_is_reference_only
    CHECK (
      (source_url IS NOT NULL AND vehicle_model IS NOT NULL)
      OR (
        segment_key LIKE 'png_band/%'
        AND source_url IS NULL
        AND vehicle_model IS NULL
        AND requires_exact_roster = FALSE
        AND actual_vehicle_confirmed = FALSE
      )
    );

COMMENT ON COLUMN public.published_train_png_number_ranges.source_url IS
  'Nullable only for png_band/% pure reference intervals; never synthesize a source URL.';
COMMENT ON COLUMN public.published_train_png_number_ranges.vehicle_model IS
  'Nullable only for png_band/% pure reference intervals; PNG band does not establish physical stock identity.';
