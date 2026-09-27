import type { Track, TrackStep } from "@/types/domain";

export type TrackWithSteps = Track & {
  steps: TrackStep[];
  current: TrackStep | null;
  finished: number;
};
