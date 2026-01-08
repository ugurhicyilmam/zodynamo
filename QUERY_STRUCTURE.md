Query

- entity()
  - primary()
    - partitionFrom()
    - partitionValue()
  - lsi()
    - partitionFrom()
    - partitionValue()
  - gsi()
    - partitionFrom()
    - partitionValue()
- entities()

We'll update the structure for Query.

First three step stays the same,
new Query().entity(SomeEntity)
.(primary|lsi|gsi)()
.(partitionFrom|partitionValue)();

Then we'll have the sort step if the table defines a range key, otherwise it'll be skipped. Methods to be renamed as range.

We'll have two methods for range.

- .range(RangeOptions)
- .rangeFrom(Args) - works similar to partitionFrom, args are the fields used to generate the rangeKey. Basically works like eq option but calculated automatically with the fields.
- .rangeNoCondition() - Goes to the next step without defining any range condition.

RangeOptions:

- eq: string | number | boolean (same as rangeKey type)
- gt: string | number | boolean (same as rangeKey type)
- gte: string | number | boolean (same as rangeKey type)
- lt: string | number | boolean (same as rangeKey type)
- lte: string | number | boolean (same as rangeKey type)
- between: [string | number | boolean, string | number | boolean] (same as rangeKey type)
- beginsWith: string (only if rangeKey type is string)

Only one of the options can be used at a time.

If no rangeKey defined in the table, directly goes to the next step.

Next step is:

- .options(QueryOptions)
- .raw()
- .select(Path[])
- .count()
- .exec()

QueryOptions:

- consistent: boolean (default: false) - only available if (primary|lsi), not available if (gsi)
- tableName: string (overrides the entity's table name)
- limit number (integer >= 1)
- order: 'asc' | 'desc' (default: 'asc')
- filter: Condition
- startKey: DynamoKey

Path: string[] - path to the field in the entity

Condition:
Each condition contains an attribute path and an operator. You can only specify one operator per condition. Or a rawAttr for the internal entity attribute path.

ConditionOperator:
value conditions

- eq: scalar
- ne: scalar
- in: scalar[]
- contains: scalar (only for string, sets or list attributes)
- exists: boolean
- type: 'string' | 'number' | 'boolean' | 'binary' | 'list' | 'map' | 'null' | 'number_set' | 'string_set' | 'binary_set'

scalar = boolean, number, string, or binary depending on the attribute type

range conditions
gte: sortable
gt: sortable
lte: sortable
lt: sortable
between: [sortable, sortable]
beginsWith: sortable

sortable = string | number | binary depending on the attr type

Valid conditions:
{ attr: 'name', eq: 'foo' }
{ rawAttr: 'n', eq: 'foo' }
{ attr: 'age', gte: 18 }
{ rawAttr: 'a', gte: 18 }

Operations can be combined:

{ or: [{ attr: 'age', gte: 18 }, { attr: 'age', lte: 18 }]}
{ and: [{ attr: 'age', gte: 18 }, { attr: 'age', lte: 18 }] }

If options if defined, next step is .raw(), .select(), .count(), .exec()

If no options defined, next step is .raw(), .select(), .count(), .exec()

Only one option can be selected between .raw(), .select(), .count().

.exec() is the final step.
