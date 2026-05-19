import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InviteeEntity } from "@/infrastructure/db/entities/Invitee";

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    backgroundColor: "#fbf7f1",
  },
  hero: {
    height: 220,
    backgroundColor: "#c08081",
    color: "white",
    padding: 48,
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 8,
    color: "white",
    opacity: 0.85,
  },
  body: {
    padding: 48,
  },
  greeting: {
    fontSize: 22,
    color: "#1f2933",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontSize: 11,
    color: "#8aa088",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  bodyText: {
    fontSize: 11,
    color: "#1f2933",
    lineHeight: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#c08081",
    opacity: 0.25,
    marginVertical: 20,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#1f2933",
    opacity: 0.5,
    textAlign: "center",
  },
});

type Props = { event: EventEntity; invitee: InviteeEntity };

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function WeddingInvitationDoc({ event, invitee }: Props) {
  const guestName = invitee.partner_first_name
    ? `${invitee.primary_first_name} & ${invitee.partner_first_name}`
    : invitee.primary_first_name;
  const dateLine = `${formatDate(event.starts_at)} · ${formatTime(event.starts_at)}${
    event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""
  }`;
  const locationLine = event.formatted_address ?? event.address_text;

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.hero}>
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.5 }}
            />
          ) : null}
          <Text style={styles.heroTitle}>{event.title}</Text>
          <Text style={styles.heroSubtitle}>{dateLine}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.greeting}>Dear {guestName},</Text>
          <Text style={styles.bodyText}>You&apos;re invited.</Text>

          {event.description ? (
            <>
              <Text style={styles.sectionTitle}>From the hosts</Text>
              <Text style={styles.bodyText}>{stripHtml(event.description)}</Text>
            </>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>When</Text>
          <Text style={styles.bodyText}>{dateLine}</Text>

          <Text style={styles.sectionTitle}>Where</Text>
          <Text style={styles.bodyText}>{locationLine || "Location to be confirmed"}</Text>

          {event.dress_code ? (
            <>
              <Text style={styles.sectionTitle}>Dress code</Text>
              <Text style={styles.bodyText}>{event.dress_code}</Text>
            </>
          ) : null}

          {(event.schedule ?? []).length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Schedule</Text>
              {(event.schedule ?? []).map((item, idx) => (
                <Text key={idx} style={styles.bodyText}>
                  {item.time} — {item.title}
                  {item.description ? ` · ${item.description}` : ""}
                </Text>
              ))}
            </>
          ) : null}

          {event.gift_registry_url ? (
            <>
              <Text style={styles.sectionTitle}>Gift registry</Text>
              <Text style={styles.bodyText}>{event.gift_registry_url}</Text>
            </>
          ) : null}
        </View>
        <Text style={styles.footer}>RSVP at {process.env.APP_BASE_URL ?? ""}/invite/{invitee.invite_token}</Text>
      </Page>
    </Document>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
