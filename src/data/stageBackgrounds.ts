export function stageBackgroundKey(stageId: string) {
  const stageNo = Number(stageId.replace('stage_', '')) || 1
  if (stageNo <= 3) return 'stage_forest_bg'
  if (stageNo <= 6) return 'stage_facility_entrance_bg'
  if (stageNo <= 15) return 'stage_base_day_bg'
  if (stageNo <= 23) return 'stage_base_evening_bg'
  if (stageNo <= 30) return 'stage_base_night_bg'
  return null
}
