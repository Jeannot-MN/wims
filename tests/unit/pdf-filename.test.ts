import { describe, expect, it } from "vitest";
import { filenameFor } from "@/application/services/pdf-service";
import type { InviteGuestInput } from "@/domain/invite/invite-view-model";

function makeInvitee(overrides: Partial<InviteGuestInput> = {}): InviteGuestInput {
  return {
    primary_first_name: "Jeannot",
    primary_last_name: "Ngalula",
    partner_first_name: null,
    partner_last_name: null,
    invite_token: "RY2xrJab7Q",
    ...overrides,
  };
}

describe("filenameFor", () => {
  it("names the file after the guest", () => {
    expect(filenameFor(makeInvitee())).toBe("Invitation - Jeannot Ngalula.pdf");
  });

  it("includes the partner", () => {
    const name = filenameFor(
      makeInvitee({
        primary_first_name: "Yves",
        primary_last_name: "Nkolo",
        partner_first_name: "Grace",
        partner_last_name: "Nkolo",
      }),
    );
    expect(name).toBe("Invitation - Yves & Grace Nkolo.pdf");
  });

  it("keeps hyphenated names intact", () => {
    expect(filenameFor(makeInvitee({ primary_first_name: "Anne-Marie" }))).toBe(
      "Invitation - Anne-Marie Ngalula.pdf",
    );
  });

  it("strips characters a filesystem can't carry", () => {
    const name = filenameFor(
      makeInvitee({ primary_first_name: 'Jean/not"', primary_last_name: "Ngalula" }),
    );
    expect(name).toBe("Invitation - Jean not Ngalula.pdf");
  });

  it("falls back to a neutral name when the guest has none", () => {
    expect(filenameFor(makeInvitee({ primary_first_name: "", primary_last_name: "" }))).toBe(
      "Invitation - Guest.pdf",
    );
  });
});
