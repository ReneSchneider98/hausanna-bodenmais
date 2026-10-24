# Beds24 einrichten (Booking.com + Airbnb in Echtzeit)

> Menünamen bei Beds24 können sich leicht ändern. Im Zweifel die Beds24-Hilfe zur „API V2“ nutzen.
> Der Adapter ist gegen die Beds24-API-v2-Dokumentation gebaut, aber nur mit Test-Daten (Mocks) geprüft.
> **Vor dem Go-Live einmal mit einem echten Beds24-Konto testen (Schritt 6).**

## Überblick

```
Webseite (Master) ──API──► Beds24 ──► Booking.com
        ▲                      └────► Airbnb
        └──── Webhook + Abgleich alle 5 Min. ◄──
```

| #   | Wo             | Was                                                                                                                              |
| --- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Beds24         | Konto anlegen, Unterkunft „Haus Anna“ mit 5 Zimmern (Rooms) anlegen                                                              |
| 2   | Beds24         | Booking.com und Airbnb unter **Channel Manager** verbinden und je Zimmer zuordnen                                                |
| 3   | Beds24         | **Settings → Apps & Integrations → API**: „Invite Code“ erzeugen. Rechte: Buchungen lesen + schreiben, Properties lesen          |
| 4   | Server         | Invite-Code einmalig gegen einen Refresh-Token tauschen (siehe unten)                                                            |
| 5   | Server         | In `/etc/hausanna/api.env` eintragen: `CHANNEL_PROVIDER=beds24`, `BEDS24_REFRESH_TOKEN=…`, dann `systemctl restart hausanna-api` |
| 6   | Admin → Kanäle | Je Unterkunft die **Beds24-Room-ID** eintragen und „aktiv“ einschalten → „Jetzt abgleichen“                                      |
| 7   | Beds24         | Webhook-URL eintragen (siehe unten)                                                                                              |
| 8   | Test           | Im Admin eine Sperre in der Zukunft anlegen → in Beds24/Booking.com prüfen → Sperre stornieren                                   |

## Schritt 4: Refresh-Token holen

```bash
curl -s -H "code: <INVITE_CODE>" https://api.beds24.com/v2/authentication/setup
```

Die Antwort enthält `refreshToken` → in `BEDS24_REFRESH_TOKEN` eintragen. Der Invite-Code ist danach verbraucht.

## Schritt 7: Webhook

Damit Buchungen von Booking.com/Airbnb sofort (statt nach max. 5 Minuten) ankommen:

```
https://hausanna-bodenmais.de/api/channels/beds24/webhook?secret=<BEDS24_WEBHOOK_SECRET>
```

Das Geheimnis steht in `/etc/hausanna/api.env` (wird von `install.sh` erzeugt).

## Wechsel von WordPress

Booking.com-Buchungen, die aus WordPress (iCal) importiert wurden, werden beim ersten Beds24-Abgleich
automatisch übernommen (gleiche Unterkunft + gleiche Daten), nicht als Doppelbuchung gemeldet.

## Was passiert bei Problemen?

| Situation                                        | Verhalten                                                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Beds24 nicht erreichbar                          | Buchung auf der Webseite klappt trotzdem, Status „Kanal: fehlgeschlagen“, wird automatisch erneut gesendet, Meldung im Dashboard |
| Booking.com meldet Buchung für belegten Zeitraum | Keine stille Übernahme: rote Meldung **DOPPELBUCHUNG** im Dashboard                                                              |
| Refresh-Token ungültig                           | Rote Meldung „Beds24-Login fehlgeschlagen“                                                                                       |
