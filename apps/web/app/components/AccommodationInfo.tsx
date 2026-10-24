import type { Accommodation, Extra } from '@hausanna/shared';
import { formatEuro } from '../lib/format';
import { InfoIcon } from './Icons';

export function DetailsBox({ acc }: { acc: Accommodation }) {
  return (
    <section className="box box--details" aria-labelledby="details-title">
      <h3 id="details-title" className="box__title">
        Details {acc.name}
      </h3>
      <p className="box__sub">
        <em>
          ({acc.sizeSqm} m², bis {acc.maxGuests} Personen)
        </em>
      </p>
      {acc.amenityGroups.map((g) => (
        <p key={g.title}>
          <strong>{g.title}:</strong> {g.items.join(' · ')}
        </p>
      ))}
      {acc.beds && (
        <p>
          <strong>Betten:</strong> {acc.beds}
        </p>
      )}
    </section>
  );
}

/** Preisbox: Text aus dem Admin (priceNote) oder automatisch aus den Preisdaten. */
export function PriceBox({ acc, extras }: { acc: Accommodation; extras: Extra[] }) {
  const dog = extras.filter((e) => /hund/i.test(e.name)).sort((a, b) => a.price - b.price)[0];
  return (
    <section className="box box--price" aria-labelledby="price-title">
      <InfoIcon className="box__icon" />
      <div className="box__body">
        <h4 id="price-title" className="box__title box__title--small">
          Preis und Mindestaufenthalt
        </h4>
        {acc.priceNote ? (
          <div className="content" dangerouslySetInnerHTML={{ __html: acc.priceNote }} />
        ) : (
          <p>
            <strong>
              Preis pro Nacht: {formatEuro(acc.basePricePerNight)} für {acc.baseGuests}{' '}
              {acc.baseGuests === 1 ? 'Person' : 'Personen'}
              {acc.extraGuestPricePerNight > 0 && (
                <>
                  <br />
                  jede weitere Person {formatEuro(acc.extraGuestPricePerNight)} pro Nacht
                </>
              )}
              {acc.petsAllowed && dog && (
                <>
                  <br />
                  Hund: {formatEuro(dog.price)} zusätzlich, einmalige Gebühr
                </>
              )}
              <br />
              Mindestaufenthaltsdauer: {acc.minNights} {acc.minNights === 1 ? 'Nacht' : 'Nächte'}
              <br />
              Zu bestimmten Zeiten können die Preise abweichen.
            </strong>
          </p>
        )}
      </div>
    </section>
  );
}
