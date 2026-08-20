import React from "react";
import { Document, Page, Text, View, Link, StyleSheet } from "@react-pdf/renderer";
import type { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import {
  buildInviteViewModel,
  type DensityPreset,
  type InviteViewModel,
  type ScheduleBlockVm,
  type SectionVm,
} from "@/domain/invite/invite-view-model";
import { DiamondDivider, PAGE_H, PAGE_W, PageArt, palette } from "./floral-art";
import { FALLBACK_FONT_FAMILY } from "./fonts/register";

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.paper,
    color: palette.ink,
    padding: 0,
  },
  artLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
    paddingTop: 44,
    paddingBottom: 40,
    paddingHorizontal: 46,
    alignItems: "center",
    textAlign: "center",
  },
  frontColumn: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 10.5,
    letterSpacing: 2.6,
    color: palette.inkSoft,
    textTransform: "uppercase",
    textAlign: "center",
  },
  joinLine: {
    fontSize: 10.5,
    letterSpacing: 2.2,
    lineHeight: 1.6,
    color: palette.inkSoft,
    textTransform: "uppercase",
    textAlign: "center",
    width: 260,
  },
  guestName: {
    fontSize: 16,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 14,
  },
  ampersand: {
    marginVertical: 10,
    textAlign: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    width: "100%",
  },
  dateSideCell: {
    width: 118,
    alignItems: "center",
  },
  dateRule: {
    width: 118,
    height: 0.7,
    backgroundColor: palette.ruleSoft,
    marginBottom: 8,
  },
  dateSideText: {
    fontSize: 13,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  dateGap: {
    width: 10,
  },
  dateDay: {
    width: 62,
    fontSize: 34,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: -4,
  },
  blockHeading: {
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  paragraph: {
    textAlign: "center",
  },
  rowsBlock: {
    width: 290,
    marginTop: 4,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
  },
  rowLabel: {
    width: 132,
    color: palette.inkSoft,
    textAlign: "left",
  },
  rowValue: {
    width: 158,
    color: palette.ink,
    textAlign: "left",
  },
});

type Props = {
  event: EventEntity;
  invitee: InviteeEntity;
  baseUrl?: string;
  timeZone?: string;
  fontFamily?: string;
};

export function WeddingInvitationDoc({ event, invitee, baseUrl, timeZone, fontFamily }: Props) {
  const vm = buildInviteViewModel({ event, invitee, baseUrl, timeZone });
  const family = fontFamily ?? FALLBACK_FONT_FAMILY;

  return (
    <Document title={`${event.title} — invitation`} author={event.title}>
      <FrontPage vm={vm} fontFamily={family} />
      <DetailsPage vm={vm} fontFamily={family} />
    </Document>
  );
}

export function FrontPage({ vm, fontFamily }: { vm: InviteViewModel; fontFamily: string }) {
  const { front } = vm;
  return (
    <Page size={[PAGE_W, PAGE_H]} style={[styles.page, { fontFamily }]}>
      {/* Art first: @react-pdf paints in document order, so anything later sits on top. */}
      <View style={styles.artLayer}>
        <PageArt variant="front" />
      </View>

      <View style={styles.content}>
        <View style={styles.frontColumn}>
          <Text style={styles.eyebrow}>{front.familiesLine}</Text>

          <View style={{ width: "100%", alignItems: "center" }}>
            <Text style={{ fontSize: front.nameFontSize, fontWeight: 300, letterSpacing: 2, lineHeight: 1, textAlign: "center" }}>
              {front.nameOne}
            </Text>
            {front.nameTwo ? (
              <>
                <Text style={[styles.ampersand, { fontSize: Math.round(front.nameFontSize * 0.48), fontWeight: 300 }]}>&</Text>
                <Text style={{ fontSize: front.nameFontSize, fontWeight: 300, letterSpacing: 2, lineHeight: 1, textAlign: "center" }}>
                  {front.nameTwo}
                </Text>
              </>
            ) : null}
          </View>

          <View style={{ alignItems: "center" }}>
            <Text style={[styles.eyebrow, { marginBottom: 18 }]}>{front.honourLine}</Text>
            <Text style={styles.guestName}>{front.guestName}</Text>
          </View>

          <Text style={styles.joinLine}>{front.joinLine}</Text>

          <View style={styles.dateRow}>
            <View style={styles.dateSideCell}>
              <View style={styles.dateRule} />
              <Text style={styles.dateSideText}>{front.date.weekday}</Text>
            </View>
            <View style={styles.dateGap} />
            <Text style={styles.dateDay}>{front.date.day}</Text>
            <View style={styles.dateGap} />
            <View style={styles.dateSideCell}>
              <View style={styles.dateRule} />
              <Text style={styles.dateSideText}>{front.date.month}</Text>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}

export function DetailsPage({ vm, fontFamily }: { vm: InviteViewModel; fontFamily: string }) {
  const { details, density } = vm;
  return (
    <Page size={[PAGE_W, PAGE_H]} style={[styles.page, { fontFamily }]}>
      {/* `fixed` so the frame and florals repeat if long content spills to a third page. */}
      <View style={styles.artLayer} fixed>
        <PageArt variant="details" />
      </View>

      <View style={styles.content}>
        <Text style={[styles.paragraph, { fontSize: density.bodyFs, lineHeight: density.lineHeight, width: 300 }]}>
          {details.rsvpSentence}
        </Text>

        {details.inviteUrl ? (
          <Link
            src={details.inviteUrl}
            style={{
              fontSize: details.urlFontSize,
              color: palette.ink,
              textDecoration: "underline",
              marginTop: 16,
              marginBottom: 22,
              textAlign: "center",
            }}
          >
            {details.inviteUrl}
          </Link>
        ) : (
          <View style={{ marginBottom: 16 }} />
        )}

        {details.schedule.map((block, i) => (
          <ScheduleBlock key={`schedule-${i}`} block={block} density={density} />
        ))}

        {details.sections.length ? (
          <View style={{ marginTop: 4, marginBottom: 12 }}>
            <DiamondDivider width={200} />
          </View>
        ) : null}

        {details.sections.map((section, i) => (
          <SectionBlock key={`section-${i}`} section={section} density={density} />
        ))}
      </View>
    </Page>
  );
}

function ScheduleBlock({ block, density }: { block: ScheduleBlockVm; density: DensityPreset }) {
  const [first, ...rest] = block.lines;
  return (
    <View style={{ marginBottom: density.blockGap, alignItems: "center" }} wrap={false}>
      <Text style={[styles.blockHeading, { fontSize: density.headingFs }]}>
        {block.timeLabel ? `${block.heading} - ${block.timeLabel}` : block.heading}
      </Text>
      {/* Only the heading is tracked caps — descriptions read as the host typed them. */}
      {first ? (
        <Text style={{ fontSize: density.bodyFs + 0.5, lineHeight: density.lineHeight, textAlign: "center" }}>
          {first}
        </Text>
      ) : null}
      {rest.map((line, i) => (
        <Text key={i} style={{ fontSize: density.bodyFs - 1, lineHeight: density.lineHeight, textAlign: "center", color: palette.inkSoft }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function SectionBlock({ section, density }: { section: SectionVm; density: DensityPreset }) {
  return (
    <View style={{ marginBottom: density.blockGap, alignItems: "center", width: "100%" }} wrap={false}>
      {section.heading ? (
        <Text style={[styles.blockHeading, { fontSize: density.headingFs, marginBottom: 2 }]}>{section.heading}</Text>
      ) : null}

      {section.paragraphs.map((paragraph, i) => (
        <Text key={i} style={[styles.paragraph, { fontSize: density.bodyFs, lineHeight: density.lineHeight, width: 300 }]}>
          {paragraph}
        </Text>
      ))}

      {section.rows.length ? (
        <View style={styles.rowsBlock}>
          {section.rows.map((row, i) => (
            <View key={i} style={[styles.row, { height: density.rowHeight }]}>
              <Text style={[styles.rowLabel, { fontSize: density.bodyFs }]}>{row.label}:</Text>
              <Text style={[styles.rowValue, { fontSize: density.bodyFs, maxLines: 1, textOverflow: "ellipsis" }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
