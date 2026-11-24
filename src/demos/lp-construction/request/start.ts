import { readIdea, type IdeaHandoff } from '../photo'
import { cleanZip } from '../serviceArea'
import { JOBS, type Job } from './types'

export interface RequestStart { zip: string; jobs: Job[]; idea: IdeaHandoff | null }
export const emptyStart: RequestStart = { zip: '', jobs: [], idea: null }

/** What the page was opened with: ?zip=, ?job= and any room idea. Browser only. The language comes from the URL path. */
export function readStart(): RequestStart {
  const params = new URLSearchParams(window.location.search)
  const zip = cleanZip(params.get('zip') ?? '')
  const idea = readIdea()
  const job = params.get('job')
  const jobs: Job[] = idea ? ['wall-paneling'] : (JOBS as readonly string[]).includes(job ?? '') ? [job as Job] : []
  return { zip: zip.length === 5 ? zip : '', jobs, idea }
}
