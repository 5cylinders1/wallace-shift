import { useSyncExternalStore } from 'react'
import { WHAT_NOW_PATH } from '../content/routeMeta'
import { navigate } from './router'

/**
 * Carries one fact from an enquiry form to /what-now: that a message was
 * actually delivered.
 *
 * The page explains what happens next either way, but it only says a
 * message was sent when this tab really sent one, so a bookmarked, shared,
 * or typed URL never shows a false confirmation. Nothing the visitor typed
 * is kept, only the fact that a send succeeded.
 *
 * sessionStorage covers a reload of the page. The in-memory flag covers
 * browsers that block storage, for as long as the document stays open.
 */
const STORAGE_KEY = 'ws:enquiry-sent'
let sentInThisDocument = false

/** Call only after the endpoint confirmed delivery. */
export function continueToWhatNow() {
  sentInThisDocument = true
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Storage is blocked. The in-memory flag still covers this visit.
  }
  navigate(WHAT_NOW_PATH)
}

/** `unknown` is the build-time HTML, which cannot know about this visitor. */
export type EnquiryReceipt = 'unknown' | 'sent' | 'none'

function readReceipt(): EnquiryReceipt {
  if (sentInThisDocument) return 'sent'
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1' ? 'sent' : 'none'
  } catch {
    return 'none'
  }
}

// Nothing changes the answer while the page is open.
const subscribe = () => () => {}
const readBuildSnapshot = (): EnquiryReceipt => 'unknown'

export function useEnquiryReceipt(): EnquiryReceipt {
  return useSyncExternalStore(subscribe, readReceipt, readBuildSnapshot)
}
