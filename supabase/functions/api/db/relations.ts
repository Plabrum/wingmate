import { relations } from "drizzle-orm/relations";
import { usersInAuth, profiles, datingProfiles, profilePhotos, profilePrompts, promptTemplates, promptResponses, contacts, decisions, matches, messages } from "./schema";

export const profilesRelations = relations(profiles, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [profiles.id],
		references: [usersInAuth.id]
	}),
	profilePhotos: many(profilePhotos),
	promptResponses: many(promptResponses),
	contacts_userId: many(contacts, {
		relationName: "contacts_userId_profiles_id"
	}),
	contacts_wingerId: many(contacts, {
		relationName: "contacts_wingerId_profiles_id"
	}),
	decisions_actorId: many(decisions, {
		relationName: "decisions_actorId_profiles_id"
	}),
	decisions_recipientId: many(decisions, {
		relationName: "decisions_recipientId_profiles_id"
	}),
	decisions_suggestedBy: many(decisions, {
		relationName: "decisions_suggestedBy_profiles_id"
	}),
	matches_userAId: many(matches, {
		relationName: "matches_userAId_profiles_id"
	}),
	matches_userBId: many(matches, {
		relationName: "matches_userBId_profiles_id"
	}),
	messages: many(messages),
	datingProfiles: many(datingProfiles),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	profiles: many(profiles),
}));

export const profilePhotosRelations = relations(profilePhotos, ({one}) => ({
	datingProfile: one(datingProfiles, {
		fields: [profilePhotos.datingProfileId],
		references: [datingProfiles.id]
	}),
	profile: one(profiles, {
		fields: [profilePhotos.suggesterId],
		references: [profiles.id]
	}),
}));

export const datingProfilesRelations = relations(datingProfiles, ({one, many}) => ({
	profilePhotos: many(profilePhotos),
	profilePrompts: many(profilePrompts),
	profile: one(profiles, {
		fields: [datingProfiles.userId],
		references: [profiles.id]
	}),
}));

export const profilePromptsRelations = relations(profilePrompts, ({one, many}) => ({
	datingProfile: one(datingProfiles, {
		fields: [profilePrompts.datingProfileId],
		references: [datingProfiles.id]
	}),
	promptTemplate: one(promptTemplates, {
		fields: [profilePrompts.promptTemplateId],
		references: [promptTemplates.id]
	}),
	promptResponses: many(promptResponses),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({many}) => ({
	profilePrompts: many(profilePrompts),
}));

export const promptResponsesRelations = relations(promptResponses, ({one}) => ({
	profile: one(profiles, {
		fields: [promptResponses.userId],
		references: [profiles.id]
	}),
	profilePrompt: one(profilePrompts, {
		fields: [promptResponses.profilePromptId],
		references: [profilePrompts.id]
	}),
}));

export const contactsRelations = relations(contacts, ({one}) => ({
	profile_userId: one(profiles, {
		fields: [contacts.userId],
		references: [profiles.id],
		relationName: "contacts_userId_profiles_id"
	}),
	profile_wingerId: one(profiles, {
		fields: [contacts.wingerId],
		references: [profiles.id],
		relationName: "contacts_wingerId_profiles_id"
	}),
}));

export const decisionsRelations = relations(decisions, ({one}) => ({
	profile_actorId: one(profiles, {
		fields: [decisions.actorId],
		references: [profiles.id],
		relationName: "decisions_actorId_profiles_id"
	}),
	profile_recipientId: one(profiles, {
		fields: [decisions.recipientId],
		references: [profiles.id],
		relationName: "decisions_recipientId_profiles_id"
	}),
	profile_suggestedBy: one(profiles, {
		fields: [decisions.suggestedBy],
		references: [profiles.id],
		relationName: "decisions_suggestedBy_profiles_id"
	}),
}));

export const matchesRelations = relations(matches, ({one, many}) => ({
	profile_userAId: one(profiles, {
		fields: [matches.userAId],
		references: [profiles.id],
		relationName: "matches_userAId_profiles_id"
	}),
	profile_userBId: one(profiles, {
		fields: [matches.userBId],
		references: [profiles.id],
		relationName: "matches_userBId_profiles_id"
	}),
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	match: one(matches, {
		fields: [messages.matchId],
		references: [matches.id]
	}),
	profile: one(profiles, {
		fields: [messages.senderId],
		references: [profiles.id]
	}),
}));