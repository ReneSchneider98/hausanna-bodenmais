import { useCallback, useEffect, useState } from 'react';
import { type Range, todayBerlin } from '../lib/calendar';
import type { AccommodationDetail, PublicSite } from '../lib/types';
import { DetailsBox, PriceBox } from './AccommodationInfo';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { BookingWidget } from './BookingWidget';
import { Gallery } from './Gallery';

/** Strukturierte Daten für Suchmaschinen (schema.org). */
function jsonLd(detail: AccommodationDetail, site: PublicSite, baseUrl: string) {
  const a = detail.accommodation;
  const c = site.settings.info.contact;
  const abs = (u: string) => (u.startsWith('http') ? u : `${baseUrl}${u}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: `${a.name} – ${c.name}`,
    url: `${baseUrl}/${a.slug}/`,
    description: a.teaser,
    image: [a.coverImage, ...a.images]
      .filter(Boolean)
      .slice(0, 8)
      .map((i) => abs(i!.url)),
    containsPlace: {
      '@type': 'Accommodation',
      name: a.name,
      floorSize: { '@type': 'QuantitativeValue', value: a.sizeSqm, unitCode: 'MTK' },
      occupancy: { '@type': 'QuantitativeValue', maxValue: a.maxGuests },
      petsAllowed: a.petsAllowed,
      amenityFeature: a.amenityGroups.flatMap((g) =>
        g.items.map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
      ),
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.street,
      postalCode: c.zip,
      addressLocality: c.city,
      addressCountry: 'DE',
    },
    telephone: c.phone,
    email: c.email,
    priceRange: `ab ${a.basePricePerNight} € pro Nacht`,
    checkinTime: site.settings.info.checkInFrom,
    checkoutTime: site.settings.info.checkOutUntil,
  };
}

export function AccommodationView({
  detail,
  site,
  baseUrl,
}: {
  detail: AccommodationDetail;
  site: PublicSite;
  baseUrl: string;
}) {
  const acc = detail.accommodation;
  // "heute" erst im Browser genau bestimmen; SSR nutzt die Serverzeit (beide Europe/Berlin)
  const [today] = useState(() => todayBerlin());
  const [ranges, setRanges] = useState<Range[]>([]);
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');

  const loadAvailability = useCallback(() => {
    fetch(`/api/public/accommodations/${acc.id}/availability`)
      .then((r) => (r.ok ? r.json() : { blocked: [] }))
      .then((d: { blocked: Range[] }) => setRanges(d.blocked))
      .catch(() => setRanges([]));
  }, [acc.id]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const pick = (date: string) => {
    if (!arrival || (arrival && departure) || date <= arrival) {
      setArrival(date);
      setDeparture('');
    } else {
      setDeparture(date);
    }
  };

  return (
    <div className="page page--accommodation">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(detail, site, baseUrl)) }}
      />
      <section className="section">
        <div className="row">
          <div className="title-module">
            <h1 className="page-title">{acc.name}</h1>
          </div>
          <div
            className="content acc-description"
            dangerouslySetInnerHTML={{ __html: acc.descriptionHtml }}
          />
        </div>
        <div className="row cols-2 acc-layout">
          <div className="acc-layout__main">
            <DetailsBox acc={acc} />
            <PriceBox acc={acc} extras={detail.extras} />
            <BookingWidget
              acc={acc}
              extras={detail.extras}
              ranges={ranges}
              today={today}
              arrival={arrival}
              departure={departure}
              setArrival={setArrival}
              setDeparture={(d) => setDeparture(d)}
              onBooked={loadAvailability}
            />
            <AvailabilityCalendar
              ranges={ranges}
              today={today}
              arrival={arrival}
              departure={departure}
              onPick={pick}
            />
          </div>
          <div className="acc-layout__gallery">
            <h2 className="visually-hidden">Bilder</h2>
            <Gallery
              images={acc.images.length ? acc.images : acc.coverImage ? [acc.coverImage] : []}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
