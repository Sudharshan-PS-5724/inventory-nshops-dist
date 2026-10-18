# Scale compatibility check for Windows

This guide checks the supplied POS/barcode-scale RS-232 protocol and the earlier TM-A TCP statement protocol. It is an evidence-gathering tool, not a production integration. The exact machine, firmware, wiring, interface and protocol support remain unverified until tested with the actual device.

The checker does not use an MDB file, the vendor app, or a database. It does not configure the scale, write PLUs, clear records, change prices, or update stock. It prints results to the terminal and does not create a log file by itself.

## Safety before starting

1. Ask the supplier to identify the exact model, firmware, port type and pinout. Confirm whether that specific port supports the supplied protocol. A socket labelled USB is not necessarily RS-232.
2. Do the first test while the shop is idle. Do not change calibration, factory settings, records, or product data for this test.
3. Opening a serial port can toggle electrical control signals, depending on the adapter and operating system. It is passive in the sense that the program does not send application bytes unless you explicitly request it, but electrical side effects cannot be ruled out.
4. The TM-A statement request is described as a collection operation. The document does not establish whether reading affects cursors, acknowledgements, record availability or other scale state. Get vendor confirmation and, if needed, make a vendor-approved backup before sending it. A TCP connection by itself also cannot guarantee zero effects on every device.
5. Never expose a scale's port to the public internet. Use a trusted shop network. Screenshots and raw responses may contain sales details, network addresses and device identifiers. Remove sensitive information before sharing.
6. Where a test sale is needed, agree with the shop owner how it should be handled in the machine, accounting and stock. Do not perform an actual sale or clear records without that agreement.

The checker talks to only the one IP address or serial port you specify. It does not discover, scan or modify devices.

## Open PowerShell in the project

```powershell
cd 'D:\MSI for Weighing Machine\inventory-mobile-platform'
python --version
python .\apps\collector\scale_compatibility_check.py --help
```

Python 3.10 or newer is required. On this computer, `python --version` worked during development; the `py` launcher did not find a Python installation. If `python` fails on your computer, install Python from the official Python website and make it available in the terminal, or use the full path to your Python executable.

For serial checks only, install pyserial in the Python environment you intend to use:

```powershell
python -m pip install pyserial
```

This installation needs access to your configured package source. No package is needed for network-only checks. If you prefer a project-local environment, create one and use its Python explicitly:

```powershell
python -m venv .venv-scale-check
.\.venv-scale-check\Scripts\python.exe -m pip install pyserial
.\.venv-scale-check\Scripts\python.exe .\apps\collector\scale_compatibility_check.py --help
```

When using the virtual environment, replace `python` in the commands below with `.\.venv-scale-check\Scripts\python.exe`. No PowerShell activation script is needed.

## Option A: RS-232 serial port

Use this option only if your scale has a confirmed compatible RS-232 interface and you have a correctly wired adapter. A typical setup is:

```text
Scale RS-232 port  →  supplier-confirmed cable  →  USB-to-RS-232 adapter  →  Windows PC
```

Do not connect random wires to a port. RS-232 electrical signals are not the same as TTL serial, USB data or Ethernet. The adapter driver must create a Windows COM port. If another program is already using the port, close it before the test when safe to do so.

### A1. Identify the COM port

Connect the adapter and run:

```powershell
python .\apps\collector\scale_compatibility_check.py ports
```

For example, the adapter might be shown as `COM3`. The actual number on your PC may be different. You can also inspect **Device Manager → Ports (COM & LPT)**. If unsure, compare the list before and after connecting the adapter. A COM port listing proves only that Windows sees a port, not that the scale or protocol is compatible.

### A2. Confirm settings with the supplier

The supplied RS-232 PDF lists 8 data bits, no parity and 1 stop bit, called `8N1`, and these possible baud rates: `1200`, `2400`, `4800`, `9600`. It describes continuous and stable-only output formats, and a request-response format called H. Ask the supplier which mode and baud rate are already set on your machine. Do not assume the PDF's instructions to change `Spec57` apply to your model or change settings during business hours.

### A3. Listen without sending a command

Replace `COM3` and `9600` with your confirmed values. The scale should be powered on. Keep the scale unloaded for part of the capture, then place a known weight, such as a 500 g test weight, on it and let it settle.

```powershell
python .\apps\collector\scale_compatibility_check.py serial --port COM3 --baud 9600 --duration 15
```

This listens for up to 15 seconds and shows raw bytes and possible matches for formats A through H. It does not transmit `P` in this mode. Stable-only formats may not send until the scale settles. A mode that requires a request may remain silent.

If the supplier confirms the selected protocol, limit matching to it, for example:

```powershell
python .\apps\collector\scale_compatibility_check.py serial --port COM3 --baud 9600 --duration 15 --protocol c
```

Protocol options are `a`, `b`, `c`, `d`, `e`, `f`, `g` and `h`, or `auto`. Modes 4 and 5 both use format D, modes 6 and 7 use E, modes 8 and 9 use F, and modes 10 and 11 use G. The number selects sending behavior on the scale; the letter selects the frame format in the checker.

**How to interpret the result**

- `possible_format_match`: one or more captured byte sequences look like a documented format. Compare the displayed values with the machine screen at several known weights. This is evidence, not proof that sales retrieval or PLU upload works.
- `unrecognized_bytes`: something was received, but its format did not match the selected checks. Possible causes include a different protocol, baud rate, cable, device, settings, truncated capture or document differences. Share the raw hexadecimal carefully with the supplier.
- `no_bytes_received`: inconclusive. Check cable, port, baud, enabled serial output and whether the selected protocol only replies to a request. Silence does not prove incompatibility.
- A and F may include current price and amount. A can indicate accumulated/total mode and overflow. Do not treat those flags or a stable reading as confirmation of a completed sale.
- F and G can both match the start of the same stream. F/G frames do not specify decimal positions in the frame, so the checker prints digits rather than guessing the real value. Validate against the screen and supplier documentation.
- The program collects at most 16 KiB and prints only the first 512 raw bytes plus a few matched examples. If the limit is reached, shorten `--duration` or inspect the captured samples.
- `result` is descriptive. Exit code `0` means the check ran, not that the device is compatible. Exit code `2` indicates a usage or runtime error.

### A4. Protocol H: optional active request

Only do this if the supplier confirms this exact interface is set to protocol H and confirms the request is safe. This command **sends one uppercase ASCII `P` byte** to the scale:

```powershell
python .\apps\collector\scale_compatibility_check.py serial --port COM3 --baud 9600 --protocol h --send-h-request --duration 10
```

According to the PDF, a positive stable weight can produce a weight response; five question marks can indicate an unstable or negative weight. A recognized response is still not a bill or a PLU record. Do not send this byte to an unidentified device or another protocol.

## Option B: network connection to the earlier TM-A protocol

Use this only when the supplier confirms that the machine supports the earlier TM-A network interface. Find the scale's actual private IP address and ensure the PC can route to it. They do not necessarily need the same Wi-Fi, but they need network connectivity between them. Bluetooth/RS-232 does not require Wi-Fi. A public IP or internet port forwarding is not needed.

### B1. Check TCP connectivity only

Replace the example IP. The default port is 4001 from the earlier document; specify another only if the vendor confirms it.

```powershell
python .\apps\collector\scale_compatibility_check.py network --host 192.168.1.50
```

This opens and closes one TCP connection without sending an application request. `tcp_connected` means a service accepted the connection. It does **not** identify the device, prove that it implements TM-A commands or prove records can be read. A timeout/refusal is inconclusive: check the IP, port, network, firewall and whether the service is enabled.

### B2. Optional: one TM-A statement request

Only after confirming with the supplier that this command is safe on the exact machine and reviewing the safety note above:

```powershell
python .\apps\collector\scale_compatibility_check.py network --host 192.168.1.50 --request-statement 1 --acknowledge-unknown-effects
```

This sends exactly `!0J0001A` followed by the byte values `0D 0A 03`. It asks for sequence 1, not automatically the latest sale. It is not a clear-record or PLU-write command. The sequence numbering, read side effects, reset behavior and sale format remain to be established on the hardware.

- `documented_no_data_shape` means a reply matches the document's no-data pattern for the requested sequence. It does not prove the machine has no sales at other sequences.
- `possible_statement_shape` means a reply has the expected prefix and minimum length. It is not a validated bill or parsed sale.
- `unrecognized_reply` or `incomplete_or_no_reply` is inconclusive. Partial bytes, where received, are printed for investigation.

After compatibility and side effects are established, the existing `dahua_statement_retriever.py` is a separate tool for limited statement inspection. Its interpretation of the example fields is tentative and must be verified with known real transactions. Neither program implements reliable live synchronization, PLU writing, deduplication or inventory updates.

## What if the machine is Bluetooth-only?

The HY217 user manual describes a vendor app and Bluetooth but does not document commands for our own app. This checker does not implement Bluetooth Low Energy or an unknown vendor Bluetooth protocol. If the manufacturer explicitly confirms that the machine exposes a Windows serial COM port over Bluetooth and that it uses the supplied RS-232 application protocol, you can select that confirmed COM port for the serial check. Do not assume a Bluetooth pairing automatically provides such a port. Otherwise, request the SDK and programming protocol from the manufacturer.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `No module named serial` or pyserial required | Run `python -m pip install pyserial` in the same Python environment used for the script. |
| `Access is denied` opening COM | The port may be in use by another application. Confirm the port and safely close the other application. |
| No COM port | Check the adapter driver, Device Manager, cable, and whether the machine actually provides a compatible serial interface. |
| Bytes but no match | Confirm baud and format, cabling and model. Try the supplier-confirmed protocol; do not interpret random data as sales. |
| No network connection | Verify the device IP, subnet/routing, firewall, port and vendor-confirmed network service. |
| No statement at sequence 1 | This says nothing about other sequences or whether data has already been collected. Ask the supplier about sequence semantics before further requests. |

## Repeatable checks without a machine

```powershell
python -m unittest discover -s apps/collector/tests -p test_scale_compatibility_check.py -v
```

These tests use documented example frames and simulated connections. They cannot certify the physical device, actual serial adapter, Bluetooth stack, TCP service, stock deductions or production operation.
