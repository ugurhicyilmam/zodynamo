export type Input<T> = T // Placeholder for now, can be expanded later if needed.

export interface Table<TFields extends Record<string, 'string' | 'number' | 'binary'>> {
  name: string
  entityTypeField?: string

  /**
   * An object defining the fields of the table that'll be used to create indexes. The key is the name of the field and the value is the type.
   *
   * :::note
   * You don't need to define all your fields here, just the ones you want to use for indexes.
   * :::
   *
   * While you can have fields field types other than `string`, `number`, and `binary`; you can only use these types for your indexes.
   *
   * :::caution
   * Field types cannot be changed after table creation. Any changes to field types will be ignored.
   * :::
   *
   * @example
   * ```js
   * {
   *   fields: {
   *     userId: "string",
   *     noteId: "string"
   *   }
   * }
   * ```
   */
  fields: Input<TFields>
  /**
   * Define the table's primary index. You can only have one primary index.
   *
   * @example
   * ```js
   * {
   *   primaryIndex: { hashKey: "userId", rangeKey: "noteId" }
   * }
   * ```
   */
  primaryIndex: Input<{
    /**
     * The hash key field of the index. This field needs to be defined in the `fields`.
     */
    hashKey: Input<keyof NoInfer<TFields>>
    /**
     * The range key field of the index. This field needs to be defined in the `fields`.
     */
    rangeKey?: Input<keyof NoInfer<TFields>>
  }>
  /**
   * Configure the table's global secondary indexes.
   *
   * You can have up to 20 global secondary indexes per table. And each global secondary index should have a unique name.
   *
   * @example
   *
   * ```js
   * {
   *   globalIndexes: {
   *     CreatedAtIndex: { hashKey: "userId", rangeKey: "createdAt" }
   *   }
   * }
   * ```
   */
  globalIndexes?: Input<
    Record<
      string,
      Input<{
        /**
         * The hash key field of the index. This field needs to be defined in the `fields`.
         */
        hashKey: Input<keyof NoInfer<TFields>>
        /**
         * The range key field of the index. This field needs to be defined in the `fields`.
         */
        rangeKey?: Input<keyof NoInfer<TFields>>
        /**
         * The fields to project into the index.
         * @default `"all"`
         * @example
         * Project only the key fields: `userId` and `createdAt`.
         * ```js
         * {
         *   hashKey: "userId",
         *   rangeKey: "createdAt",
         *   projection: "keys-only"
         * }
         * ```
         *
         * Project the `noteId` field in addition to the key fields.
         * ```js
         * {
         *   hashKey: "userId",
         *   rangeKey: "createdAt",
         *   projection: ["noteId"]
         * }
         * ```
         */
        projection?: Input<'all' | 'keys-only' | Input<string>[]>
      }>
    >
  >
  /**
   * Configure the table's local secondary indexes.
   *
   * Unlike global indexes, local indexes use the same `hashKey` as the `primaryIndex` of the table.
   *
   * You can have up to 5 local secondary indexes per table. And each local secondary index should have a unique name.
   *
   * @example
   * ```js
   * {
   *   localIndexes: {
   *     CreatedAtIndex: { rangeKey: "createdAt" }
   *   }
   * }
   * ```
   */
  localIndexes?: Input<
    Record<
      string,
      Input<{
        /**
         * The range key field of the index. This field needs to be defined in the `fields`.
         */
        rangeKey: Input<keyof NoInfer<TFields>>
        /**
         * The fields to project into the index.
         * @default `"all"`
         * @example
         * Project only the key field: `createdAt`.
         * ```js
         * {
         *   rangeKey: "createdAt",
         *   projection: "keys-only"
         * }
         * ```
         *
         * Project the `noteId` field in addition to the key field.
         * ```js
         * {
         *   rangeKey: "createdAt",
         *   projection: ["noteId"]
         * }
         * ```
         */
        projection?: Input<'all' | 'keys-only' | Input<string>[]>
      }>
    >
  >
  /**
   * Enable [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html) for the table.
   *
   * :::note
   * Streams are not enabled by default since there's a cost attached to storing them.
   * :::
   *
   * When an item in the table is modified, the stream captures the information and sends it to your subscriber function.
   *
   * :::tip
   * The `new-and-old-images` stream type is a good default option since it has both the new and old items.
   * :::
   *
   * You can configure what will be written to the stream:
   *
   * - `new-image`: The entire item after it was modified.
   * - `old-image`: The entire item before it was modified.
   * - `new-and-old-images`:	Both the new and the old items. A good default to use since it contains all the data.
   * - `keys-only`: Only the keys of the fields of the modified items. If you are worried about the costs, you can use this since it stores the least amount of data.
   * @default Disabled
   * @example
   * ```js
   * {
   *   stream: "new-and-old-images"
   * }
   * ```
   */
  stream?: Input<'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images'>
  /**
   * The field in the table to store the _Time to Live_ or TTL timestamp in. This field should
   * be of type `number`. When the TTL timestamp is reached, the item will be deleted.
   *
   * Read more about [Time to Live](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html).
   *
   * @example
   * Here the TTL field in our table is called `expireAt`.
   * ```js
   * {
   *   ttl: "expireAt"
   * }
   * ```
   */
  ttl?: Input<string>
  /**
   * Enable deletion protection for the table. When enabled, the table cannot be deleted.
   *
   * @example
   * ```js
   * {
   *   deletionProtection: true,
   * }
   * ```
   */
  deletionProtection?: Input<boolean>
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the DynamoDB Table resource.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table?: any // Keeping it simple for now as per user request to focus on DynamoArgs
  }
}
