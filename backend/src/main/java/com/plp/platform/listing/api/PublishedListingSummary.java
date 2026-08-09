package com.plp.platform.listing.api;

/**
 * Read-only projection returned by
 * {@link ListingModuleApi#findPublished(ListingQuery)}.
 *
 * <p>Pure scaffolding: no fields declared yet. This is the only shape of
 * listing data {@code search} is permitted to see - it is always
 * {@code status = 'PUBLISHED'} (FR7) and never the full listing entity, so
 * {@code search} cannot accidentally leak draft/withdrawn listings or
 * fields it has no business reading. Concrete fields (id, title, suburb,
 * state, price, ...) are deferred to the follow-up task that implements
 * real query logic.
 */
public record PublishedListingSummary() {
}
