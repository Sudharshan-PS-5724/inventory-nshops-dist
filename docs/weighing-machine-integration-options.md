# Weighing Machine Integration: Options and Decisions

## 1. Purpose

This note explains how weighing machines could connect to the inventory application, what information the application needs, and the differences between a live-weight connection and a transaction-record connection.

The goal is to help choose an integration that works for three shops, each of which may have multiple weighing machines. The app should track product-level stock for each shop and allow the admin to manage products and selling prices.

**Current status:** The physical machine's exact capabilities and firmware behavior are not yet verified. Examples in this note illustrate the intended behavior and are not claims of successful hardware tests or completed app features.

## 2. A simple example

A shop worker selects tomatoes on a weighing machine and places them on the scale:

| Detail | Example |
| --- | --- |
| Product | Tomato |
| Product number or PLU | 1001 |
| Weight | 1.250 kg |
| Selling price | ₹40 per kg |
| Total | ₹50 |

Calculation:

```text
1.250 kg × ₹40/kg = ₹50
```

If Shop 1 had 20.000 kg of tomatoes before this sale, the intended result is:

```text
Tomato stock before sale:  20.000 kg
Tomato sold:                1.250 kg
Tomato stock after sale:   18.750 kg
```

The app must know **which shop**, **which product**, **how much was sold**, and **whether it has already recorded the event**. It also needs the actual selling price and amount for the sale, not just the current price in the product catalogue.

## 3. Connection versus protocol

These terms are related but different:

- **Machine:** The physical weighing and printing device.
- **Connection or interface:** The way devices exchange data, such as a serial connection or a network connection.
- **Message format or application protocol:** The meaning of the bytes exchanged, including which commands and fields the machine understands.

**RS-232** is a serial interface. A particular machine can use it to exchange data in a specific format. RS-232 is not restricted to reading weight: a device could also support commands sent to it over serial, provided its own protocol implements them.

**Dahua TM-A** refers to a scale family. A TM-A communication protocol describes commands for certain machine operations. It is separate from the question of which physical interface a specific machine supports.

Some machines may support more than one interface. Do not assume that a particular scale supports both RS-232 and the TM-A network commands, or that the same commands work on both, until the supplier or a hardware test confirms it.

## 4. What a live-weight connection can provide

Depending on the machine and its configured mode, a serial connection may provide:

- Current weight.
- A status such as stable or unstable.
- In some modes, current unit price and amount.
- In a certain mode, a configurable address.

The fields and their units depend on the mode. Some modes provide weight only. The address is a configurable communication value, not automatically a globally unique machine identifier. Some formats omit decimal positions, so a value must not be interpreted without verifying the machine's settings.

A simplified example of a reading is:

```text
Current weight:     1.250 kg
Current price:      ₹40/kg
Current amount:     ₹50
```

These values describe what the scale is showing at that moment. They do not necessarily establish the product or prove that a printed sale has been recorded.

## 5. Assumption: everything placed on the scale is bought

For discussion, assume that every item placed on the scale will be purchased. This reduces the need for the app to detect a separate customer decision.

Even with that assumption, the integration still needs to establish:

1. **Product:** Is the item tomato, onion, or another product?
2. **Quantity:** What is the final valid weight for that sale?
3. **Single event:** Is this a new purchase or a repeated reading of the same weight?
4. **Shop and machine:** Which shop's stock should change?
5. **Recovery:** What happens if the connection fails during a weighing?

The assumption does not guarantee that a stable reading identifies a product, is unique, or contains a printed bill number. If the assumption stops being true in practice, automatic recording may also create sales for items that were not bought.

## 6. Why price does not reliably identify a product

Suppose both products currently cost ₹40/kg:

```text
Tomato:  ₹40/kg
Onion:   ₹40/kg
```

The scale reports 1.250 kg at ₹40/kg. The application cannot safely decide whether to reduce tomato or onion stock from that information alone.

Even if prices happen to differ today, they can change. Prices can be rounded or entered manually. Therefore, matching a product solely by price should not be used as the product identification rule.

A **PLU** is a machine product number. It can help identify the product when it is available, but the app must know how each machine's PLU maps to the app's product. The same PLU number must not be assumed to mean the same product on every machine without verification.

## 7. Approaches to product identification

### Option A: Select the product in the app

The worker selects the product in the app. A connected scale provides the weight.

```text
Select Tomato in app
        ↓
Place tomatoes on scale
        ↓
Receive and validate weight
        ↓
Record one sale for Tomato
        ↓
Reduce this shop's Tomato stock
```

**Advantage:** The app knows the product even if the serial data does not include a PLU.

**Trade-off:** If the worker also has to select the product on the machine, this may mean two selections. A fast product search, favourites, or shortcuts could reduce friction, but the correct procedure must be agreed with shop staff.

### Option B: Scan a product barcode

The worker scans a barcode that maps to an app product, then weighs the item.

```text
Scan Tomato barcode → Identify Tomato → Read weight → Record sale
```

This needs usable product barcodes and a scanner or suitable phone camera. The scanned barcode must identify the product reliably; a random receipt or label barcode must not be assumed to do so.

### Option C: Receive the selected PLU from the machine

The ideal low-friction flow would be:

```text
Worker selects PLU on machine
        ↓
Machine sends PLU and final weight
        ↓
App maps machine PLU to product
        ↓
App records the sale
```

Whether this is possible depends on the actual machine and its supported commands. The currently identified live-weight formats do not establish that the selected PLU is transmitted. Ask the supplier for the selected-PLU command and its response format.

### Option D: Retrieve a transaction record

A machine may store or send transaction records containing product-related information and weight. If the exact device supports a suitable statement command, the app could retrieve records rather than asking the worker to select the product a second time.

This is the preferred direction for an automatic machine-based workflow, subject to verifying what the record actually represents, its fields, identity, availability after reconnection, and any effects of reading it.

## 8. Repeated weight readings are not repeated sales

A machine may send the same live reading several times:

```text
Reading 1: 1.250 kg
Reading 2: 1.250 kg
Reading 3: 1.250 kg
```

These may be repeated measurements of one item. Treating each line as a separate sale would deduct 3.750 kg instead of 1.250 kg.

One possible rule is:

1. The product has been selected or identified.
2. The weight is positive, in the expected unit, and stable.
3. Record that weighing once.
4. Require the scale to return close to zero before accepting another weighing.

This rule is only a proposal. It can fail if the worker adds more items without clearing the scale, removes an item only partially, changes the tare, or follows an unexpected workflow. It also needs an explicit policy for consecutive bags that happen to weigh the same amount.

A confirmation action in the app or a reliable machine-generated transaction reference may be safer. The final choice must be tested with real shop operations. Invalid, unstable, negative, overflowed, or ambiguous readings must not silently reduce stock.

## 9. Reading data and writing data

### Reading

Reading obtains information from the machine. Examples include current weight or a transaction record, if supported.

```text
Machine → Integration → App/backend
```

For a usable sale, the system needs enough information to map the product and shop, record the quantity and price, and prevent duplicate processing.

### Writing

Writing sends information to the machine and may change its stored configuration or products. For this app, the important example is updating a PLU and its selling price.

```text
Admin changes price in app
        ↓
Backend records the change
        ↓
Integration sends the updated PLU to the machine
        ↓
Machine update is verified, if supported
```

For example, the admin changes Tomato from ₹40/kg to ₹45/kg. The app should save the price change and its history, then update the relevant machines if their protocol supports it. A machine that is disconnected or rejects an update must not be shown as successfully updated.

The price recorded for a past sale should remain the price actually charged at that time. Changing today's product price must not rewrite historical sales.

Writing is optional for using the inventory app, but without a supported machine write method, someone may have to update prices on each machine manually. The app and machine can otherwise disagree.

## 10. Managing multiple shops and machines

The intended ownership model is:

```text
Shop 1: Machine A, Machine B
Shop 2: Machine C
Shop 3: Machine D, Machine E
```

Each machine should have an application-assigned ID and be registered to one shop. The system can also store verified hardware identifiers and connection details separately.

Each product mapping should relate a machine's PLU to an app product. If Machine B belongs to Shop 1 and reports a validated Tomato sale, only Shop 1's Tomato stock should be reduced.

An address or a port number is connection information; it is not automatically a permanent, globally unique hardware identity.

## 11. Proposed architecture for mobile users

For unattended machine collection, a possible architecture is:

```text
Weighing machines in a shop
            ↓
Shop-local collector or gateway
            ↓
Backend and database
            ↓
Admin and shop users' mobile apps
```

The local collector would communicate with the machines and send validated data to the backend. Multiple mobile phones could use the same backend without each phone connecting directly to every machine.

For RS-232, machines generally need suitable serial connections to the collector. For a network connection, the collector needs a network route to the machines. The phones and machines do not inherently have to be on the same Wi-Fi, although their relevant connections must be reachable.

This architecture is a proposal, not a guarantee that collection or synchronization is already implemented. The deployment needs, failure handling, security and cost must be tested for the actual shops. Full application offline mode remains out of scope for now; a reliable collector still needs a defined approach to connectivity interruptions.

## 12. Comparison for the intended workflow

| Need | Live-weight-only serial data | Transaction-record integration |
| --- | --- | --- |
| Show current weight | Possible when a compatible mode is available | Depends on the machine's supported operations |
| Identify the product | Needs a separate product selection, scan, or supported PLU message | Possible if a verified record includes a usable product reference |
| Record a sale once | Needs a carefully defined event or confirmation rule | Needs a verified record identity and duplicate handling |
| Retrieve missed events | Not established for a live stream alone | Possible only if the machine stores and permits recovery of records |
| Update PLU prices | Requires a supported write command | Requires a supported write command; sales retrieval alone is not enough |
| Get a complete printed bill | Not established by live weight alone | Depends on available record and bill-grouping data |

The TM-A command set is a candidate for transaction retrieval and PLU writing, but its actual capabilities must be validated on the specific machine. A richer RS-232 protocol could also be suitable if the device supports the required commands.

## 13. Questions for the supplier

1. What is the exact model, firmware version, and connection type of each machine?
2. Can the machine send the currently selected PLU over RS-232? Please provide the command and an example response.
3. Can it send or store completed sale records with PLU, weight, price, amount, time and a unique record number?
4. Can missed sales be retrieved after a network or collector outage? How long are they retained?
5. Does requesting a sales record change a cursor, clear anything, acknowledge a record, or otherwise alter machine state?
6. Can products and prices be written programmatically? How is success confirmed or read back?
7. What are the supported unit, currency, decimal precision, product capacity and PLU limits?
8. Can several machines be collected by one gateway, and what connection settings and identifiers are required?

## 14. Recommended decision path

1. Identify the actual machine and confirm its supported interfaces.
2. Check whether live-weight data can be read with a known test weight.
3. Ask for selected-PLU and completed-sale commands, including any serial options.
4. If the machine supports transaction retrieval, compare one safely created test sale with the actual raw record and printed output.
5. Confirm record identity, reconnection behavior, and read side effects before automating stock deductions.
6. Verify a price update on a test PLU before enabling machine price synchronization.
7. Choose the shop workflow only after testing the device and observing how staff use it.

**Current recommendation:** Investigate the transaction-record approach first because it is better aligned with automatic product-level inventory deductions. Use live serial weight with app-side product selection as an alternative if the device cannot provide reliable transaction and PLU data. Neither approach is ready for production until hardware behavior and failure handling are verified.
