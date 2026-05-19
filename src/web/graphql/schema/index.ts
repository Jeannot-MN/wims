import { builder } from "../builder";

// Side-effect imports register types onto the builder.
import "./health";
import "./auth";
import "./event";
import "./invitee";
import "./rsvp";
import "./dashboard";

export const schema = builder.toSchema();
