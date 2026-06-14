import {
  getPipelineStatus,
  PIPELINE_LABELS,
  PIPELINE_BADGE_CLASSES,
  type MatchPipelineFields,
} from "@/lib/matches/pipelineStatus";

export default function MatchPipelineBadge({ match }: { match: MatchPipelineFields }) {
  const status = getPipelineStatus(match);
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${PIPELINE_BADGE_CLASSES[status]}`}>
      {PIPELINE_LABELS[status]}
    </span>
  );
}
