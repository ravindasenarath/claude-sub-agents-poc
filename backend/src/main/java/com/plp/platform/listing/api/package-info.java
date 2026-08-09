/**
 * Published interface of the {@code listing} module.
 *
 * <p>Per module-boundaries.md, the intended operations here are (to be
 * implemented in a follow-up task, alongside the DB schema/migrations
 * task): {@code createDraft}, {@code updateListing}, {@code changeStatus},
 * {@code withdraw}/{@code delete}, {@code getOwnListings(agentId)} (FR6),
 * {@code getPublishedListing(id)} (FR7 - only {@code PUBLISHED} listings are
 * ever returned from a public-read path).
 *
 * <p>{@link com.plp.platform.listing.api.ListingModuleApi} is a scaffolding
 * marker only.
 */
package com.plp.platform.listing.api;
