import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import ContractorsLander from './demos/contractors/ContractorsLander'
import { RoofersOffer } from './demos/roofers-offer/RoofersOffer'

/** Only the two public marketing collections belong in this renderer.
 * Fictional demo implementations remain in their separate protected build. */
export function renderCollection(collection: 'contractors' | 'roofers-offer'): string {
  return renderToString(
    <StrictMode>
      {collection === 'contractors' ? <ContractorsLander /> : <RoofersOffer />}
    </StrictMode>,
  )
}
