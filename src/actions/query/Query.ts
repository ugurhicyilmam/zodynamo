import { Entity } from '../../types/Entity'
import { GlobalIndexName, LocalIndexName } from '../../types/EntityKey'
import { GsiQuery } from './GsiQuery'
import { LsiQuery } from './LsiQuery'
import { PrimaryQuery } from './PrimaryQuery'

/**
 * Entry point for building queries on an Entity.
 */
export class Query {
  /**
   * Selects the entity to query.
   *
   * @param entity - The entity definition to query against.
   * @returns A selector to choose between primary, GSI, or LSI queries.
   */
  entity<E extends Entity<any, any, any, any, any, any, any, any, any>>(
    entity: E
  ): QueryEntitySelector<E> {
    return new QueryEntitySelector(entity)
  }
}

/**
 * Intermediate builder to select the index to query.
 */
export class QueryEntitySelector<E extends Entity<any, any, any, any, any, any, any, any, any>> {
  constructor(protected entity: E) {}

  /**
   * Query the table's Primary Index (Partition Key + Optional Sort Key).
   */
  primary(): PrimaryQuery<E> {
    return new PrimaryQuery(this.entity)
  }

  /**
   * Query a Global Secondary Index (GSI).
   *
   * @param indexName - The name of the GSI to query.
   */
  gsi<N extends GlobalIndexName<E['table']>>(indexName: N): GsiQuery<E, N> {
    return new GsiQuery(this.entity, indexName)
  }

  /**
   * Query a Local Secondary Index (LSI).
   *
   * @param indexName - The name of the LSI to query.
   */
  lsi<N extends LocalIndexName<E['table']>>(indexName: N): LsiQuery<E, N> {
    return new LsiQuery(this.entity, indexName)
  }
}
