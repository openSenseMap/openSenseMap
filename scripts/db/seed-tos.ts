import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { envDBSchema } from './env-schema'
import { tosVersion } from '~/db/schema'

type LocalizedText = {
	en: string
	de: string
}

type SeedTosOptions = {
	version?: string
	title?: LocalizedText
	body?: LocalizedText
	effectiveFrom?: Date
	acceptBy?: Date
}

export async function seedTos(
	db: PostgresJsDatabase<any>,
	options: SeedTosOptions = {},
) {
	const now = new Date()

	const effectiveFrom =
		options.effectiveFrom ?? new Date('2026-09-10T00:00:00.000Z')
	const acceptBy = options.acceptBy ?? new Date('2027-01-01T00:00:00.000Z')

	await db
		.insert(tosVersion)
		.values({
			version: options.version ?? '2026-09',
			title: options.title ?? {
				en: 'Terms of Service',
				de: 'Nutzungsbedingungen',
			},
			body: options.body ?? {
				en: `
# Nutzungsbedingungen für die openSenseMap und damit verbundene Dienste

Die openSenseMap ist ein Projekt der openSenseLab gGmbH (nachfolgend „Wir“ genannt). Über die Plattform haben Nutzer:innen die Möglichkeit, Messstationen zu registrieren und Daten hochzuladen und zu visualisieren.

Ziel ist es, eine offene Datengrundlage für Bildung, Umwelt- und Klimaschutz, Begeisterung für MINT, Citizen Science, Open Data und Open Source Projekte zu schaffen.

Verbundene Dienste:

- https://community.staging.opensensemap.org
- https://ttn.opensensemap.org
- https://mqtt.opensensemap.org

## 1. Gegenstand der Nutzungsbedingungen

Um die eingangs genannten Ziele zu erreichen, ist das Anlegen eines Accounts auf der Plattform erforderlich. Im Anschluss können Umweltmessgeräte bzw. Sensoren (nachfolgend "Device" genannt) angelegt werden. Für den Abruf von Daten ist eine Registrierung auf der Plattform nicht erforderlich, da die Daten auch über eine API und ein Archiv verfügbar sind. Gegenstand der Nutzungsbedingungen ist ausschließlich die Bereitstellung der Plattform, das Hochladen, Visualisieren und öffentliche Bereitstellen der Daten. Wir stehen in keinerlei rechtlicher oder tatsächlicher Verbindung zur Erstellung der Devices, der produzierten Daten bzw. deren Verwendung durch Dritte, sowie der zugehörigen Metadaten und Beschreibungen.

## 2. Wofür gelten diese Nutzungsbedingungen?

Diese Nutzungsbedingungen regeln die Nutzung der Plattform. Sie gelten für alle Nutzer:innen der Plattform und für alle Handlungen, die Nutzer:innen auf der Plattform vornehmen können.

## 3. Registrierung: Erstellen von Devices und Hochladen von Sensordaten

3.1 Die Registrierung auf der Plattform ist erforderlich für deren Nutzung zwecks Hochladen von Daten. Die Registrierung kann durch Anlage eines Nutzer:innenaccounts vorgenommen werden.

3.2 Durch die Registrierung wird ein Profil (inkl. frei wählbarem Username) erstellt, welches im Nachgang noch weiter bearbeitet werden kann. Nutzende können Angaben auf dem Profil ändern und den Account nebst Profil selbst löschen, wenn er nicht mehr benötigt wird. Optional lässt sich ein Profilbild hochladen und ein Anzeigename hinzufügen. Profile sind standardmäßig unsichtbar, können jedoch auf Wunsch der Nutzer:in öffentlich geschaltet werden. In diesem Fall sind Username, Anzeigename, Profilbild und zugehörige Devices öffentlich einsehbar.

3.3 Als Anmeldedaten für den Login werden nach der Registrierung die jeweils hinterlegte E-Mail-Adresse oder Username und das vergebene Passwort benötigt.

3.4 Für den Zugriff auf das Diskussionsforum können registrierte Nutzer:innen ihr bestehendes Nutzer:innen-Account über das Single‑Sign‑On‑Verfahren (SSO) verwenden. Durch die Anmeldung wird ein einmaliger Authentifizierungs‑Token zwischen der Plattform und dem Diskussionsforum‑Server ausgetauscht.

3.5 Um ein Device zu erstellen, sind zunächst Angaben zum Namen des Devices, Informationen zum Standort (ggf. genauer Standort), Device-Typ und genutzte Sensoren notwendig. Es kann zudem eine Kurzbeschreibung inklusive Bilder erstellt werden.

Es ist untersagt, Inhalte (z.B. Bilder, Symbole) zu verwenden, die Bezug zu diskriminierenden, fremdenfeindlichen, ableistischen, gewaltverherrlichenden oder jugendgefährdenden Themen haben. Zudem ist das unrechtmäßige Verwenden rechtlich geschützten Materials (insbesondere von Bildern, die fremden Lizenz- oder Urheberrechtsbestimmungen unterliegen oder fremder Markenkennzeichen) untersagt. Wir sind nicht verpflichtet, die Ausgestaltung der Inhalte rechtlich oder tatsächlich zu prüfen, sind aber berechtigt, Inhalte, bei denen Anlass dazu besteht, dass sie derartigen Bezug aufweisen, unverzüglich und ohne vorherige Ankündigung zu löschen.

3.6 Automatisches Archivieren von Devices: Wir behalten uns vor, Devices automatisch zu archivieren, falls diese 12 Monate lang keine Sensordaten empfangen haben. Archivierte Devices können keine neuen Daten mehr empfangen, speichern oder anderweitig verändert werden.

## 4. Pflichten der Nutzer:innen

4.1 Bei der Registrierung müssen die Nutzer:innen einen Username vergeben.

4.2 Das Nutzen eines Accounts ist nur für den eingangs beschriebenen Zweck vorgesehen und erlaubt. Eine Nutzung zu anderen Zwecken kann zur Sperrung des Accounts führen. Es ist weiterhin untersagt, persönliche Zugangsdaten anderen zu überlassen. Die Zugangsdaten sind so aufzubewahren, dass eine unbefugte Verwendung durch andere nicht möglich ist. Wird festgestellt, dass entgegen dieser Bestimmungen Account-Daten weitergegeben oder in unzulässiger Weise genutzt wurden, haben wir das Recht, die betreffenden Nutzenden von der Plattform auszuschließen.

4.3 Ebenfalls ist es untersagt, auf der Plattform Werbung für Produkte oder Firmen zu machen, welche nicht unmittelbar mit dem Thema openSenseMap zu tun haben. Sofern Nutzer:innen eine weitergehende gewerbliche Nutzung beabsichtigen, ist das vorbehaltlich unserer ausdrücklichen Zustimmung bzw. der ausdrücklichen Zustimmung unserer Rechtsnachfolger mit entsprechender Vereinbarung zulässig. Eine weitergehende kommerzielle Nutzung ist ausgeschlossen. Wird festgestellt, dass entgegen dieser Bestimmungen Werbung gemacht oder andere unzulässige gewerbliche Handlungen vorgenommen werden, haben wir das Recht, die betreffenden Nutzenden von der Plattform auszuschließen oder die Inhalte zu löschen. Über die Löschung der Inhalte werden die Nutzenden unverzüglich informiert.

## 5. Verbotene Handlungen und Äußerungen auf der Plattform; Rechtsfolgen

Nachfolgende Handlungen und Äußerungen sind verboten und führen zu einem sofortigen Ausschluss von der Plattform:

- Beleidigungen gegen andere Nutzer:innen oder Personen
- Mobbing und Belästigung anderer Nutzer:innen oder Personen
- Beiträge, die Gewaltdarstellungen beinhalten
- Beiträge, die pornografische oder menschenverachtende Inhalte zeigen
- Beiträge, die zum Hass oder der Gewalt gegen Menschen oder gegen bestimmte Gruppen von Menschen aufstacheln
- Beiträge, die zu Gewalt oder anderen Maßnahmen gegen Menschen oder gegen eine bestimmte Gruppe von Menschen auffordern, oder die Menschenwürde anderer dadurch angreifen, dass Teile der Bevölkerung oder eine vorbezeichnete Gruppe beschimpft, böswillig verächtlich gemacht oder verleumdet werden
- Beiträge, die ein unter der Herrschaft des Nationalsozialismus (auch bekannt unter dem „Dritten Reich“) begangene Handlung leugnen oder verharmlosen oder die Herrschaft des Nationalsozialismus verherrlichen
- Beiträge, die Kennzeichen verbotener Organisationen zeigen oder solche Zeichen beschreiben
- Beiträge, die zum Konsum, Kauf oder Verkauf von gesetzlich verbotenen Mitteln (Drogen, Betäubungsmitteln) aufrufen
- Das Posten von urheberrechtlich geschützten Inhalten, Bildern und Videos ohne Zustimmung der jeweiligen Rechteinhaber:innen.

## 6. Rechteeinräumung; Lizenzierung der Sensordaten

6.1 Nach Maßgabe dieser Nutzungsbedingungen gewähren wir den Nutzenden derzeit das Recht zur unentgeltlichen Nutzung der Plattform. Wir behalten uns vor, in Zukunft den Service teilweise kostenpflichtig anzubieten oder ergänzende Services kostenpflichtig anzubieten.

6.2 Wir räumen den Nutzenden ein nicht-ausschließliches, zeitlich und räumlich auf die Dauer und den Umfang der Nutzung beschränktes Recht ein, die Plattform zu nutzen.

6.3 Die Plattform steht den Nutzenden in der jeweils abruffähigen Version zur Verfügung. Der Quellcode steht allen Personen unter der MIT Lizenz unter: https://github.com/opensensemap zur Verfügung.

6.4 Alle Inhalte, die von Nutzer:innen auf der Plattform geteilt, veröffentlicht und verbreitet werden, können entsprechend der Lizenzbedingungen genutzt werden.

6.5 Für Nutzungsrechte hinsichtlich der openSenseMap gilt:
Registrierte Nutzer:innen haben das Recht, Devices auf der Plattform zu erstellen und Sensordaten zu veröffentlichen.
Die Nutzer:in räumt uns für die Zwecke des Plattformbetriebs und das Erreichen der eingangs beschriebenen Ziele das räumlich, zeitlich unbeschränkte Recht ein, Meta-Daten der Devices (inkl. Device-Bilder), Sensordaten und Account-Informationen (inkl. Profilbildern) in allen bekannten und künftigen Wiedergabeformen zu verwenden. Dieses Recht beinhaltet in Bezug auf Device- und Sensordaten auch das Recht der öffentlichen Wiedergabe, das Recht zur Veröffentlichung und Lizenzierung unter der unten genannten Lizenz. Sachlich ist dieses Recht auf die Zwecke der openSenseMap beschränkt. Hierfür wird seitens der Nutzer:in gewährleistet, dass alle Komponenten, aus denen Device und Sensordaten bestehen, der vorbeschrieben Nutzung nicht entgegenstehen.

Devices und zugehörige Sensordaten werden beim Erstellen automatisch als PDDL lizenziert. Der volle Lizenztext kann hier eingesehen werden: https://opendatacommons.org/licenses/pddl/1-0/

Was bedeutet das konkret?

Die Ersteller:in der Daten (nachfolgend "Contributor" genannt) bleiben Eigentümer:innen der hochgeladenen Daten und können über diese ohne jegliche Einschränkungen verfügen.

Sämtliche auf die openSenseMap hochgeladenen Daten stehen der Öffentlichkeit zur freien Nutzung zur Verfügung und können auf der Plattform öffentlich eingesehen und heruntergeladen werden (siehe API). Die Nutzung der so unter der PDDL-Lizenz zur Verfügung gestellten Daten unterliegt somit den folgenden Bedingungen. Original-Text einer Menschen-lesbaren Variante der Lizenz ist hier zu finden: [https://opendatacommons.org/licenses/pddl/summary/](https://opendatacommons.org/licenses/pddl/summary/)

Kurz gesagt, du darfst:

- Teilen: Die Daten kopieren, verbreiten und verwenden.
- Erzeugen: Werke aus den Daten erstellen.
- Anpassen: Die Daten verändern und darauf aufbauen.

## 6.6 Zugriff auf die Sensordaten per API und Archiv

Neben der von uns bereitgestellten Visualisierung der auf der openSenseMap hochgeladenen Sensordaten auf einer digitalen Karte, besteht ebenfalls die Möglichkeit, auf Daten per API zuzugreifen und gesamte Datenpakete in verschiedenen Formaten aus dem Archiv herunterzuladen.

Zugriff per API: Eine detaillierte Dokumentation der API befindet sich hier: https://docs.opensensemap.org/. Zum aktuellen Zeitpunkt sind Sensordaten der letzten 24 Monate per API verfügbar. Die volle zeitliche Auflösung ist 12 Monate verfügbar, stündliche Mittelwerte 18 Monate und tägliche Mittelwerte 24 Monate.

Wir behalten uns vor, oben genannte Zeiträume der Verfügbarkeit per API anzupassen.

## 7. Veränderung des Funktionsumfangs auf der Plattform

7.1 Wir bemühen uns, das Angebot an Leistungen und Funktionen, die über die Plattform genutzt werden können, konstant zu halten und weiter auszubauen.

7.2 Wir haben das Recht, einzelne Funktionen zu ändern, zu erweitern, einzuschränken oder ganz einzustellen. Wenn wir eine Funktion zukünftig nicht mehr zur Verfügung stellen, teilen wir das den Nutzer:innen rechtzeitig mit. Wir behalten uns das Recht vor, das SSO‑Verfahren zum Zugriff auf das Diskussionsforum jederzeit zu ändern, einzustellen oder einzelne Nutzer:innen vom SSO‑Zugang auszuschließen.

7.3 Die Plattform soll möglichst kontinuierlich weiterentwickelt werden. Aufgrund der Weiterentwicklung der Plattform können sich sowohl der Leistungsumfang, die Benutzungsoberfläche als auch die Bedienung der Plattform ändern. Wir sind zu entsprechenden Änderungen berechtigt.

## 8. Prüfpflichten, Haftung; Ausschluss der Verantwortlichkeit

8.1 Wir sind nicht verpflichtet, die eingetragenen oder hochgeladenen Daten sowie im Diskussionsforum veröffentlichten Inhalte sachlich oder rechtlich zu prüfen und nehmen daher auch keinerlei derartigen Prüfschritte vor.

8.2 Die Haftung richtet sich nach den gesetzlichen Bestimmungen.

8.3 Wir sind nicht am Zustandekommen von Aufträgen, Geschäftsbeziehungen oder Verträgen, die Akteur:innen in Bezug auf die openSenseMap schließen, beteiligt. Eine rechtliche oder kommerzielle Verantwortung für die Begründung, Durchführung oder Abwicklung der entsprechenden Verträge übernehmen wir nicht.

## 9. Änderungen dieser Bestimmungen; Verfügbarkeit der Plattform

9.1 Wir haben das Recht, diese Nutzungsbedingungen jederzeit zu ändern und informieren über etwaige Änderungen direkt über die Plattform und per E-Mail.

9.2 Wir haben das Recht, die Plattform vorübergehend oder dauerhaft abzuschalten. Die Abschaltung erfolgt in der Regel vorübergehend aus technischen Gründen (technischer Fehler, Wartungen und/oder Updates).

## 10. Datenschutz

Informationen zum Schutz personenbezogener Daten erhaltet ihr in der zugehörigen Datenschutzerklärung.

## 11. Anwendbares Recht und Gerichtsstand

Das anwendbare Recht ist das der Bundesrepublik Deutschland. Der Gerichtsstand ist, soweit eine Auswahl zulässig ist, der Sitz der Betreiberin.
        `.trim(),
				de: `
# Nutzungsbedingungen für die openSenseMap und damit verbundene Dienste

Die openSenseMap ist ein Projekt der openSenseLab gGmbH (nachfolgend „Wir“ genannt). Über die Plattform haben Nutzer:innen die Möglichkeit, Messstationen zu registrieren und Daten hochzuladen und zu visualisieren.

Ziel ist es, eine offene Datengrundlage für Bildung, Umwelt- und Klimaschutz, Begeisterung für MINT, Citizen Science, Open Data und Open Source Projekte zu schaffen.

Verbundene Dienste:

- https://community.staging.opensensemap.org
- https://ttn.opensensemap.org
- https://mqtt.opensensemap.org

## 1. Gegenstand der Nutzungsbedingungen

Um die eingangs genannten Ziele zu erreichen, ist das Anlegen eines Accounts auf der Plattform erforderlich. Im Anschluss können Umweltmessgeräte bzw. Sensoren (nachfolgend "Device" genannt) angelegt werden. Für den Abruf von Daten ist eine Registrierung auf der Plattform nicht erforderlich, da die Daten auch über eine API und ein Archiv verfügbar sind. Gegenstand der Nutzungsbedingungen ist ausschließlich die Bereitstellung der Plattform, das Hochladen, Visualisieren und öffentliche Bereitstellen der Daten. Wir stehen in keinerlei rechtlicher oder tatsächlicher Verbindung zur Erstellung der Devices, der produzierten Daten bzw. deren Verwendung durch Dritte, sowie der zugehörigen Metadaten und Beschreibungen.

## 2. Wofür gelten diese Nutzungsbedingungen?

Diese Nutzungsbedingungen regeln die Nutzung der Plattform. Sie gelten für alle Nutzer:innen der Plattform und für alle Handlungen, die Nutzer:innen auf der Plattform vornehmen können.

## 3. Registrierung: Erstellen von Devices und Hochladen von Sensordaten

3.1 Die Registrierung auf der Plattform ist erforderlich für deren Nutzung zwecks Hochladen von Daten. Die Registrierung kann durch Anlage eines Nutzer:innenaccounts vorgenommen werden.

3.2 Durch die Registrierung wird ein Profil (inkl. frei wählbarem Username) erstellt, welches im Nachgang noch weiter bearbeitet werden kann. Nutzende können Angaben auf dem Profil ändern und den Account nebst Profil selbst löschen, wenn er nicht mehr benötigt wird. Optional lässt sich ein Profilbild hochladen und ein Anzeigename hinzufügen. Profile sind standardmäßig unsichtbar, können jedoch auf Wunsch der Nutzer:in öffentlich geschaltet werden. In diesem Fall sind Username, Anzeigename, Profilbild und zugehörige Devices öffentlich einsehbar.

3.3 Als Anmeldedaten für den Login werden nach der Registrierung die jeweils hinterlegte E-Mail-Adresse oder Username und das vergebene Passwort benötigt.

3.4 Für den Zugriff auf das Diskussionsforum können registrierte Nutzer:innen ihr bestehendes Nutzer:innen-Account über das Single‑Sign‑On‑Verfahren (SSO) verwenden. Durch die Anmeldung wird ein einmaliger Authentifizierungs‑Token zwischen der Plattform und dem Diskussionsforum‑Server ausgetauscht.

3.5 Um ein Device zu erstellen, sind zunächst Angaben zum Namen des Devices, Informationen zum Standort (ggf. genauer Standort), Device-Typ und genutzte Sensoren notwendig. Es kann zudem eine Kurzbeschreibung inklusive Bilder erstellt werden.

Es ist untersagt, Inhalte (z.B. Bilder, Symbole) zu verwenden, die Bezug zu diskriminierenden, fremdenfeindlichen, ableistischen, gewaltverherrlichenden oder jugendgefährdenden Themen haben. Zudem ist das unrechtmäßige Verwenden rechtlich geschützten Materials (insbesondere von Bildern, die fremden Lizenz- oder Urheberrechtsbestimmungen unterliegen oder fremder Markenkennzeichen) untersagt. Wir sind nicht verpflichtet, die Ausgestaltung der Inhalte rechtlich oder tatsächlich zu prüfen, sind aber berechtigt, Inhalte, bei denen Anlass dazu besteht, dass sie derartigen Bezug aufweisen, unverzüglich und ohne vorherige Ankündigung zu löschen.

3.6 Automatisches Archivieren von Devices: Wir behalten uns vor, Devices automatisch zu archivieren, falls diese 12 Monate lang keine Sensordaten empfangen haben. Archivierte Devices können keine neuen Daten mehr empfangen, speichern oder anderweitig verändert werden.

## 4. Pflichten der Nutzer:innen

4.1 Bei der Registrierung müssen die Nutzer:innen einen Username vergeben.

4.2 Das Nutzen eines Accounts ist nur für den eingangs beschriebenen Zweck vorgesehen und erlaubt. Eine Nutzung zu anderen Zwecken kann zur Sperrung des Accounts führen. Es ist weiterhin untersagt, persönliche Zugangsdaten anderen zu überlassen. Die Zugangsdaten sind so aufzubewahren, dass eine unbefugte Verwendung durch andere nicht möglich ist. Wird festgestellt, dass entgegen dieser Bestimmungen Account-Daten weitergegeben oder in unzulässiger Weise genutzt wurden, haben wir das Recht, die betreffenden Nutzenden von der Plattform auszuschließen.

4.3 Ebenfalls ist es untersagt, auf der Plattform Werbung für Produkte oder Firmen zu machen, welche nicht unmittelbar mit dem Thema openSenseMap zu tun haben. Sofern Nutzer:innen eine weitergehende gewerbliche Nutzung beabsichtigen, ist das vorbehaltlich unserer ausdrücklichen Zustimmung bzw. der ausdrücklichen Zustimmung unserer Rechtsnachfolger mit entsprechender Vereinbarung zulässig. Eine weitergehende kommerzielle Nutzung ist ausgeschlossen. Wird festgestellt, dass entgegen dieser Bestimmungen Werbung gemacht oder andere unzulässige gewerbliche Handlungen vorgenommen werden, haben wir das Recht, die betreffenden Nutzenden von der Plattform auszuschließen oder die Inhalte zu löschen. Über die Löschung der Inhalte werden die Nutzenden unverzüglich informiert.

## 5. Verbotene Handlungen und Äußerungen auf der Plattform; Rechtsfolgen

Nachfolgende Handlungen und Äußerungen sind verboten und führen zu einem sofortigen Ausschluss von der Plattform:

- Beleidigungen gegen andere Nutzer:innen oder Personen
- Mobbing und Belästigung anderer Nutzer:innen oder Personen
- Beiträge, die Gewaltdarstellungen beinhalten
- Beiträge, die pornografische oder menschenverachtende Inhalte zeigen
- Beiträge, die zum Hass oder der Gewalt gegen Menschen oder gegen bestimmte Gruppen von Menschen aufstacheln
- Beiträge, die zu Gewalt oder anderen Maßnahmen gegen Menschen oder gegen eine bestimmte Gruppe von Menschen auffordern, oder die Menschenwürde anderer dadurch angreifen, dass Teile der Bevölkerung oder eine vorbezeichnete Gruppe beschimpft, böswillig verächtlich gemacht oder verleumdet werden
- Beiträge, die ein unter der Herrschaft des Nationalsozialismus (auch bekannt unter dem „Dritten Reich“) begangene Handlung leugnen oder verharmlosen oder die Herrschaft des Nationalsozialismus verherrlichen
- Beiträge, die Kennzeichen verbotener Organisationen zeigen oder solche Zeichen beschreiben
- Beiträge, die zum Konsum, Kauf oder Verkauf von gesetzlich verbotenen Mitteln (Drogen, Betäubungsmitteln) aufrufen
- Das Posten von urheberrechtlich geschützten Inhalten, Bildern und Videos ohne Zustimmung der jeweiligen Rechteinhaber:innen.

## 6. Rechteeinräumung; Lizenzierung der Sensordaten

6.1 Nach Maßgabe dieser Nutzungsbedingungen gewähren wir den Nutzenden derzeit das Recht zur unentgeltlichen Nutzung der Plattform. Wir behalten uns vor, in Zukunft den Service teilweise kostenpflichtig anzubieten oder ergänzende Services kostenpflichtig anzubieten.

6.2 Wir räumen den Nutzenden ein nicht-ausschließliches, zeitlich und räumlich auf die Dauer und den Umfang der Nutzung beschränktes Recht ein, die Plattform zu nutzen.

6.3 Die Plattform steht den Nutzenden in der jeweils abruffähigen Version zur Verfügung. Der Quellcode steht allen Personen unter der MIT Lizenz unter: https://github.com/opensensemap zur Verfügung.

6.4 Alle Inhalte, die von Nutzer:innen auf der Plattform geteilt, veröffentlicht und verbreitet werden, können entsprechend der Lizenzbedingungen genutzt werden.

6.5 Für Nutzungsrechte hinsichtlich der openSenseMap gilt:
Registrierte Nutzer:innen haben das Recht, Devices auf der Plattform zu erstellen und Sensordaten zu veröffentlichen.
Die Nutzer:in räumt uns für die Zwecke des Plattformbetriebs und das Erreichen der eingangs beschriebenen Ziele das räumlich, zeitlich unbeschränkte Recht ein, Meta-Daten der Devices (inkl. Device-Bilder), Sensordaten und Account-Informationen (inkl. Profilbildern) in allen bekannten und künftigen Wiedergabeformen zu verwenden. Dieses Recht beinhaltet in Bezug auf Device- und Sensordaten auch das Recht der öffentlichen Wiedergabe, das Recht zur Veröffentlichung und Lizenzierung unter der unten genannten Lizenz. Sachlich ist dieses Recht auf die Zwecke der openSenseMap beschränkt. Hierfür wird seitens der Nutzer:in gewährleistet, dass alle Komponenten, aus denen Device und Sensordaten bestehen, der vorbeschrieben Nutzung nicht entgegenstehen.

Devices und zugehörige Sensordaten werden beim Erstellen automatisch als PDDL lizenziert. Der volle Lizenztext kann hier eingesehen werden: https://opendatacommons.org/licenses/pddl/1-0/

Was bedeutet das konkret?

Die Ersteller:in der Daten (nachfolgend "Contributor" genannt) bleiben Eigentümer:innen der hochgeladenen Daten und können über diese ohne jegliche Einschränkungen verfügen.

Sämtliche auf die openSenseMap hochgeladenen Daten stehen der Öffentlichkeit zur freien Nutzung zur Verfügung und können auf der Plattform öffentlich eingesehen und heruntergeladen werden (siehe API). Die Nutzung der so unter der PDDL-Lizenz zur Verfügung gestellten Daten unterliegt somit den folgenden Bedingungen. Original-Text einer Menschen-lesbaren Variante der Lizenz ist hier zu finden: [https://opendatacommons.org/licenses/pddl/summary/](https://opendatacommons.org/licenses/pddl/summary/)

Kurz gesagt, du darfst:

- Teilen: Die Daten kopieren, verbreiten und verwenden.
- Erzeugen: Werke aus den Daten erstellen.
- Anpassen: Die Daten verändern und darauf aufbauen.

## 6.6 Zugriff auf die Sensordaten per API und Archiv

Neben der von uns bereitgestellten Visualisierung der auf der openSenseMap hochgeladenen Sensordaten auf einer digitalen Karte, besteht ebenfalls die Möglichkeit, auf Daten per API zuzugreifen und gesamte Datenpakete in verschiedenen Formaten aus dem Archiv herunterzuladen.

Zugriff per API: Eine detaillierte Dokumentation der API befindet sich hier: https://docs.opensensemap.org/. Zum aktuellen Zeitpunkt sind Sensordaten der letzten 24 Monate per API verfügbar. Die volle zeitliche Auflösung ist 12 Monate verfügbar, stündliche Mittelwerte 18 Monate und tägliche Mittelwerte 24 Monate.

Wir behalten uns vor, oben genannte Zeiträume der Verfügbarkeit per API anzupassen.

## 7. Veränderung des Funktionsumfangs auf der Plattform

7.1 Wir bemühen uns, das Angebot an Leistungen und Funktionen, die über die Plattform genutzt werden können, konstant zu halten und weiter auszubauen.

7.2 Wir haben das Recht, einzelne Funktionen zu ändern, zu erweitern, einzuschränken oder ganz einzustellen. Wenn wir eine Funktion zukünftig nicht mehr zur Verfügung stellen, teilen wir das den Nutzer:innen rechtzeitig mit. Wir behalten uns das Recht vor, das SSO‑Verfahren zum Zugriff auf das Diskussionsforum jederzeit zu ändern, einzustellen oder einzelne Nutzer:innen vom SSO‑Zugang auszuschließen.

7.3 Die Plattform soll möglichst kontinuierlich weiterentwickelt werden. Aufgrund der Weiterentwicklung der Plattform können sich sowohl der Leistungsumfang, die Benutzungsoberfläche als auch die Bedienung der Plattform ändern. Wir sind zu entsprechenden Änderungen berechtigt.

## 8. Prüfpflichten, Haftung; Ausschluss der Verantwortlichkeit

8.1 Wir sind nicht verpflichtet, die eingetragenen oder hochgeladenen Daten sowie im Diskussionsforum veröffentlichten Inhalte sachlich oder rechtlich zu prüfen und nehmen daher auch keinerlei derartigen Prüfschritte vor.

8.2 Die Haftung richtet sich nach den gesetzlichen Bestimmungen.

8.3 Wir sind nicht am Zustandekommen von Aufträgen, Geschäftsbeziehungen oder Verträgen, die Akteur:innen in Bezug auf die openSenseMap schließen, beteiligt. Eine rechtliche oder kommerzielle Verantwortung für die Begründung, Durchführung oder Abwicklung der entsprechenden Verträge übernehmen wir nicht.

## 9. Änderungen dieser Bestimmungen; Verfügbarkeit der Plattform

9.1 Wir haben das Recht, diese Nutzungsbedingungen jederzeit zu ändern und informieren über etwaige Änderungen direkt über die Plattform und per E-Mail.

9.2 Wir haben das Recht, die Plattform vorübergehend oder dauerhaft abzuschalten. Die Abschaltung erfolgt in der Regel vorübergehend aus technischen Gründen (technischer Fehler, Wartungen und/oder Updates).

## 10. Datenschutz

Informationen zum Schutz personenbezogener Daten erhaltet ihr in der zugehörigen Datenschutzerklärung.

## 11. Anwendbares Recht und Gerichtsstand

Das anwendbare Recht ist das der Bundesrepublik Deutschland. Der Gerichtsstand ist, soweit eine Auswahl zulässig ist, der Sitz der Betreiberin.
        `.trim(),
			},
			effectiveFrom,
			acceptBy,
			updatedAt: now,
		})
		.onConflictDoNothing()
}

async function main() {
	console.log(`📄 setting up drizzle client to ${envDBSchema.DATABASE_URL}`)

	const queryClient = postgres(envDBSchema.DATABASE_URL, {
		max: 1,
		ssl: envDBSchema.PG_CLIENT_SSL === 'true' ? true : false,
	})

	const db = drizzle(queryClient)

	try {
		await seedTos(db)
	} finally {
		await queryClient.end({ timeout: 5 })
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((e) => {
		console.error(e)
		process.exit(1)
	})
}
