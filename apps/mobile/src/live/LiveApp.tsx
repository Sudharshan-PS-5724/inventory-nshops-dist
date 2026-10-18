import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { apiRequest, ApiError } from "../api/client";
import { supabase } from "../auth/supabase";
import { darkColors, lightColors } from "../theme";
import { scaled, dateAt, kilograms } from "./values";

type Identity = {
  userId: string;
  role: "ADMIN" | "SHOP_USER";
  assignedShopIds: string[];
};
type Shop = { id: string; name: string; locationId: string; timezone: string };
type Product = { id: string; name: string; paisePerKg: string | null };
type Machine = {
  id: string;
  name: string;
  hardwareIdentifier: string;
  active: boolean;
};
type Stock = { productId: string; productName: string; availableGrams: string };
type Action =
  | "opening"
  | "machine"
  | "csv"
  | "mapping"
  | "price"
  | "transfer"
  | "wastage"
  | "recovery"
  | "expense";
const actionNames: Record<Action, string> = {
  opening: "Opening stock",
  machine: "Register machine",
  csv: "Import CSV",
  mapping: "Map PLU",
  price: "Change price",
  transfer: "Transfer stock",
  wastage: "Record wastage",
  recovery: "Recovery sale",
  expense: "Record expense",
};

export function LiveApp({ onPreview }: { onPreview: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [allowPreview, setAllowPreview] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shopId, setShopId] = useState("");
  const [date, setDate] = useState("");
  const [stock, setStock] = useState<Stock[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [action, setAction] = useState<Action | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<{
    body: string;
    rowCount: number;
  } | null>(null);
  const pending = useRef<{
    fingerprint: string;
    key: string;
    body: string;
  } | null>(null);
  const loadingGeneration = useRef(0);
  const submitting = useRef(false);
  const shop = shops.find((item) => item.id === shopId);
  const c = dark ? darkColors : lightColors;
  const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: c.canvas },
    content: { padding: 20, gap: 16, paddingBottom: 60 },
    title: { color: c.ink, fontSize: 28, fontWeight: "700" },
    heading: { color: c.ink, fontSize: 19, fontWeight: "600" },
    text: { color: c.ink, fontSize: 16 },
    muted: { color: c.inkMuted, fontSize: 13 },
    card: {
      backgroundColor: c.surface,
      padding: 18,
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
    },
    input: {
      color: c.ink,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 10,
      padding: 13,
      fontSize: 16,
      backgroundColor: c.surface,
    },
    button: {
      backgroundColor: c.lime,
      padding: 14,
      borderRadius: 12,
      minHeight: 48,
    },
    buttonText: { color: c.limeDeep, fontWeight: "600", fontSize: 15 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  });

  useEffect(() => {
    let active = true;
    supabase!.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        setSession(data.session);
        setRestoring(false);
      })
      .catch((e) => {
        if (active) {
          setError(String(e));
          setRestoring(false);
        }
      });
    const { data } = supabase!.auth.onAuthStateChange((_event, value) => {
      if (active) setSession(value);
    });
    supabase!.auth.startAutoRefresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase!.auth.startAutoRefresh();
      else supabase!.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      subscription.remove();
      supabase!.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIdentity(null);
    setShops([]);
    setStock([]);
    setMachines([]);
    setProducts([]);
    setShopId("");
    setAction(null);
    setCsvPreview(null);
    setFields({});
    setCounts({});
    setDeviceIds([]);
    pending.current = null;
    if (!session) return;
    Promise.all([
      apiRequest<Identity>("/identity", session.access_token),
      apiRequest<Shop[]>("/shops", session.access_token),
      apiRequest<Product[]>("/products", session.access_token),
    ])
      .then(([actor, locations, catalog]) => {
        if (!active) return;
        setIdentity(actor);
        setShops(locations);
        setProducts(catalog);
        if (locations[0]) {
          setShopId(locations[0].id);
          setDate(dateAt(locations[0].timezone));
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setAllowPreview(!(e instanceof ApiError) || e.status >= 500);
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user.id, reload]);

  async function refresh() {
    const generation = ++loadingGeneration.current;
    setStock([]);
    setMachines([]);
    if (!session || !shop || !date) return;
    try {
      const deviceRows = await apiRequest<Machine[]>(
        `/machines?shopId=${shop.id}`,
        session.access_token,
      );
      if (generation !== loadingGeneration.current) return;
      setMachines(deviceRows);
      const rows = await apiRequest<Stock[]>(
        `/inventory/availability?locationId=${shop.locationId}&businessDate=${encodeURIComponent(date)}`,
        session.access_token,
      );
      if (generation === loadingGeneration.current) setStock(rows);
    } catch (e) {
      if (generation === loadingGeneration.current) {
        setError((e as Error).message);
        setAllowPreview(!(e instanceof ApiError) || e.status >= 500);
      }
    }
  }
  useEffect(() => {
    setError("");
    void refresh();
    return () => {
      loadingGeneration.current++;
    };
  }, [shopId, date, session?.access_token]);

  async function login() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setAllowPreview(false);
    try {
      const { error } = await supabase!.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
      const status =
        typeof e === "object" && e !== null && "status" in e
          ? Number(e.status)
          : undefined;
      setAllowPreview(
        (status !== undefined && (status === 0 || status >= 500)) ||
          (e instanceof Error &&
            ["TypeError", "AuthRetryableFetchError"].includes(e.name)),
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function update(name: string, value: string) {
    setFields((previous) => ({ ...previous, [name]: value }));
    setCsvPreview(null);
  }
  function field(name: string, label: string, multiline = false) {
    return (
      <View key={name} style={{ gap: 6 }}>
        <Text style={styles.muted}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          editable={!busy}
          value={fields[name] ?? ""}
          onChangeText={(value) => update(name, value)}
          multiline={multiline}
          autoCapitalize="none"
          style={[
            styles.input,
            multiline && { minHeight: 140, textAlignVertical: "top" },
          ]}
          placeholderTextColor={c.inkMuted}
        />
      </View>
    );
  }
  function button(label: string, onPress: () => void, disabled = false) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        disabled={busy || disabled}
        onPress={onPress}
        style={[styles.button, (busy || disabled) && { opacity: 0.5 }]}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
    );
  }
  function chooseProduct() {
    return (
      <View style={styles.row}>
        {products.map((item) =>
          button(
            `${fields.productId === item.id ? "✓ " : ""}${item.name}`,
            () => update("productId", item.id),
          ),
        )}
      </View>
    );
  }
  function importBody() {
    return { shopId, businessDate: date, deviceIds, csv: fields.csv ?? "" };
  }

  async function previewCsv() {
    if (!session || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify(importBody());
      const result = await apiRequest<{ rowCount: number }>(
        "/master-imports/preview",
        session.access_token,
        { method: "POST", body },
      );
      setCsvPreview({ body, rowCount: result.rowCount });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function submit() {
    if (!session || !shop || !action || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let path = "",
        body: object = {};
      const productId = fields.productId ?? "";
      const now = new Date().toISOString();
      if (action === "opening") {
        if (
          !products.length ||
          products.some(
            (p) => counts[p.id] === undefined || counts[p.id] === "",
          )
        )
          throw new Error(
            "Enter a physical count for every product. Use 0 for none.",
          );
        path = "/opening-stock/submissions";
        body = {
          locationId: shop.locationId,
          businessDate: date,
          lines: products.map((p) => ({
            productId: p.id,
            quantityGrams: scaled(counts[p.id], 3),
          })),
        };
      } else if (action === "machine") {
        path = "/machines";
        body = {
          shopId,
          name: fields.name,
          hardwareIdentifier: fields.asset,
          machineType: "DAHUA_TM_A",
        };
      } else if (action === "csv") {
        path = "/master-imports";
        body = importBody();
        if (csvPreview?.body !== JSON.stringify(body))
          throw new Error("Preview this CSV and selection before confirming.");
      } else if (action === "mapping") {
        path = "/machine-plu-mappings";
        body = {
          deviceId: fields.deviceId,
          mappings: [{ pluCode: fields.plu, productId }],
        };
      } else if (action === "price") {
        if (!productId) throw new Error("Choose a product.");
        path = `/products/${productId}/prices`;
        body = { paisePerKg: scaled(fields.amount ?? "", 2) };
      } else if (action === "transfer") {
        path = "/transfers";
        body = {
          sourceLocationId: shop.locationId,
          destinationLocationId: fields.destination,
          businessDate: date,
          items: [
            { productId, quantityGrams: scaled(fields.quantity ?? "", 3) },
          ],
        };
      } else if (action === "wastage") {
        path = "/wastage";
        body = {
          locationId: shop.locationId,
          businessDate: date,
          occurredAt: now,
          productId,
          quantityGrams: scaled(fields.quantity ?? "", 3),
          ...(fields.reason ? { reason: fields.reason } : {}),
        };
      } else if (action === "recovery") {
        path = "/recovery-sales";
        body = {
          locationId: shop.locationId,
          businessDate: date,
          soldAt: now,
          paymentMode: fields.payment ?? "CASH",
          items: [
            { productId, quantityGrams: scaled(fields.quantity ?? "", 3) },
          ],
        };
      } else if (action === "expense") {
        path = "/expenses";
        body = {
          locationId: shop.locationId,
          expenseDate: date,
          category: fields.category,
          amountPaise: scaled(fields.amount ?? "", 2),
        };
      }
      // Keep the exact timestamp-bearing request for an uncertain retry, provided form inputs are unchanged.
      const fingerprint = JSON.stringify({
        userId: session.user.id,
        path,
        shopId,
        date,
        fields,
        counts,
        deviceIds,
      });
      if (pending.current?.fingerprint !== fingerprint)
        pending.current = {
          fingerprint,
          key: `${session.user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          body: JSON.stringify(body),
        };
      const request = pending.current!;
      await apiRequest(path, session.access_token, {
        method: "POST",
        headers: { "Idempotency-Key": request.key },
        body: request.body,
      });
      pending.current = null;
      setAction(null);
      setFields({});
      setCounts({});
      setDeviceIds([]);
      setCsvPreview(null);
      setNotice(
        "Saved to the server. Machine registration and PLU mapping do not program the physical scale.",
      );
      if (action === "csv" || action === "price") {
        try {
          setProducts(
            await apiRequest<Product[]>("/products", session.access_token),
          );
        } catch {
          setError(
            "Saved successfully, but the product list could not be refreshed. Reconnect to refresh it.",
          );
        }
      }
      await refresh();
    } catch (e) {
      setError(
        `${(e as Error).message} Nothing is marked saved locally. If the connection failed, retry unchanged to reuse the same request key.`,
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const admin = identity?.role === "ADMIN";
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.row}>
            <Text style={styles.title}>Kirana Ledger</Text>
            {button(dark ? "Light mode" : "Dark mode", () => setDark(!dark))}
          </View>
          <Text style={styles.muted}>
            Live workspace · server-authorized shop access
          </Text>
          {!!error && (
            <View style={styles.card}>
              <Text accessibilityRole="alert" style={styles.text}>
                {error}
              </Text>
              {session &&
                !pending.current &&
                button("Retry connection", () => {
                  setError("");
                  setAllowPreview(false);
                  setReload((value) => value + 1);
                })}
              {allowPreview &&
                !pending.current &&
                button("Open demo data (no server writes)", onPreview)}
            </View>
          )}
          {!!notice && (
            <Text accessibilityRole="alert" style={styles.text}>
              {notice}
            </Text>
          )}
          {restoring ? (
            <Text style={styles.text}>Restoring session…</Text>
          ) : !session ? (
            <View style={styles.card}>
              <Text style={styles.heading}>Sign in</Text>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor={c.inkMuted}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Password"
                secureTextEntry
                placeholder="Password"
                placeholderTextColor={c.inkMuted}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
              {button(busy ? "Signing in…" : "Sign in", () => void login())}
            </View>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.text}>
                  {identity
                    ? admin
                      ? "Owner / Admin"
                      : "Shop user"
                    : "Loading access…"}
                </Text>
                {button("Sign out", () => {
                  void supabase!.auth.signOut().then(({ error }) => {
                    if (error) setError(error.message);
                  });
                })}
              </View>
              {identity && !shops.length && (
                <Text style={styles.text}>
                  No active shops are assigned. The owner must create a shop and
                  assign access through the API.
                </Text>
              )}
              <View style={styles.row}>
                {shops.map((item) =>
                  button(
                    `${shopId === item.id ? "✓ " : ""}${item.name}`,
                    () => {
                      setShopId(item.id);
                      setDate(dateAt(item.timezone));
                      setAction(null);
                      setFields({});
                      setDeviceIds([]);
                      setCounts({});
                      setCsvPreview(null);
                    },
                  ),
                )}
              </View>
              {shop && (
                <>
                  <Text style={styles.muted}>
                    Business date ({shop.timezone})
                  </Text>
                  <TextInput
                    accessibilityLabel="Business date YYYY-MM-DD"
                    value={date}
                    editable={!busy}
                    onChangeText={(value) => {
                      setDate(value);
                      setCsvPreview(null);
                    }}
                    style={styles.input}
                  />
                  <View style={styles.card}>
                    <Text style={styles.heading}>Available inventory</Text>
                    {button("Refresh inventory", () => void refresh())}
                    {stock.map((row) => (
                      <View key={row.productId} style={styles.row}>
                        <Text style={styles.text}>{row.productName}</Text>
                        <Text style={styles.text}>
                          {kilograms(row.availableGrams)} kg
                        </Text>
                      </View>
                    ))}
                    {!stock.length && (
                      <Text style={styles.muted}>
                        No stock loaded. Check opening stock and any error
                        above.
                      </Text>
                    )}
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.heading}>Registered machines</Text>
                    {machines.map((machine) => (
                      <View key={machine.id}>
                        <Text style={styles.text}>
                          {machine.name} · {machine.hardwareIdentifier}
                        </Text>
                        <Text style={styles.muted}>
                          {machine.active
                            ? "Registered, connection not verified"
                            : "Inactive"}
                        </Text>
                      </View>
                    ))}
                    {!machines.length && (
                      <Text style={styles.muted}>No registered machines.</Text>
                    )}
                  </View>
                  <View style={styles.row}>
                    {(Object.keys(actionNames) as Action[])
                      .filter(
                        (item) =>
                          admin ||
                          [
                            "opening",
                            "wastage",
                            "recovery",
                            "expense",
                          ].includes(item),
                      )
                      .map((item) =>
                        button(actionNames[item], () => {
                          setAction(item);
                          setFields({});
                          setDeviceIds([]);
                          setCounts({});
                          setCsvPreview(null);
                          setError("");
                        }),
                      )}
                  </View>
                  {action && (
                    <View style={styles.card}>
                      <Text style={styles.heading}>{actionNames[action]}</Text>
                      {action === "opening" && (
                        <>
                          <Text style={styles.muted}>
                            Submit once per day. This locks the shop's physical
                            baseline.
                          </Text>
                          {products.map((p) => (
                            <View key={p.id}>
                              <Text style={styles.muted}>{p.name} (kg)</Text>
                              <TextInput
                                accessibilityLabel={`${p.name} opening kg`}
                                editable={!busy}
                                keyboardType="decimal-pad"
                                value={counts[p.id] ?? ""}
                                onChangeText={(value) =>
                                  setCounts((old) => ({
                                    ...old,
                                    [p.id]: value,
                                  }))
                                }
                                style={styles.input}
                              />
                            </View>
                          ))}
                        </>
                      )}
                      {action === "machine" && (
                        <>
                          {field("name", "Counter name")}
                          {field(
                            "asset",
                            "Unique physical asset label, e.g. SHOP01-SCALE01",
                          )}
                          <Text style={styles.muted}>
                            Dahua TM-A registration only. No network connection
                            is established.
                          </Text>
                        </>
                      )}
                      {[
                        "mapping",
                        "price",
                        "transfer",
                        "wastage",
                        "recovery",
                      ].includes(action) && chooseProduct()}
                      {action === "csv" && (
                        <>
                          <Text style={styles.muted}>
                            Paste UTF-8 CSV with headers:
                            product_code,name,plu,initial_price_per_kg,opening_kg,recovery_percent.
                            Select machines below. Existing prices are
                            unchanged.
                          </Text>
                          {field("csv", "Master CSV contents", true)}
                          <View style={styles.row}>
                            {machines
                              .filter((m) => m.active)
                              .map((m) =>
                                button(
                                  `${deviceIds.includes(m.id) ? "✓ " : ""}${m.name}`,
                                  () => {
                                    setDeviceIds((ids) =>
                                      ids.includes(m.id)
                                        ? ids.filter((id) => id !== m.id)
                                        : [...ids, m.id],
                                    );
                                    setCsvPreview(null);
                                  },
                                ),
                              )}
                          </View>
                          {button("Preview CSV", () => void previewCsv())}
                          {csvPreview && (
                            <Text style={styles.text}>
                              {csvPreview.rowCount} rows passed format checks.
                              Confirming locks opening stock; the server still
                              checks conflicts.
                            </Text>
                          )}
                        </>
                      )}
                      {action === "mapping" && (
                        <>
                          <View style={styles.row}>
                            {machines
                              .filter((m) => m.active)
                              .map((m) =>
                                button(
                                  `${fields.deviceId === m.id ? "✓ " : ""}${m.name}`,
                                  () => update("deviceId", m.id),
                                ),
                              )}
                          </View>
                          {field("plu", "PLU code (leading zeros preserved)")}
                        </>
                      )}
                      {action === "transfer" && (
                        <>
                          <Text style={styles.muted}>Destination shop</Text>
                          <View style={styles.row}>
                            {shops
                              .filter((s) => s.id !== shopId)
                              .map((s) =>
                                button(
                                  `${fields.destination === s.locationId ? "✓ " : ""}${s.name}`,
                                  () => update("destination", s.locationId),
                                ),
                              )}
                          </View>
                        </>
                      )}
                      {["transfer", "wastage", "recovery"].includes(action) &&
                        field("quantity", "Quantity (kg)")}
                      {action === "wastage" &&
                        field("reason", "Reason (optional)")}
                      {action === "recovery" && (
                        <View style={styles.row}>
                          {["CASH", "UPI", "CARD", "OTHER"].map((mode) =>
                            button(
                              `${(fields.payment ?? "CASH") === mode ? "✓ " : ""}${mode}`,
                              () => update("payment", mode),
                            ),
                          )}
                        </View>
                      )}
                      {action === "expense" &&
                        field("category", "Expense category")}
                      {["price", "expense"].includes(action) &&
                        field(
                          "amount",
                          action === "price"
                            ? "Selling price (rupees per kg)"
                            : "Amount (rupees)",
                        )}
                      {button(
                        busy ? "Saving…" : "Confirm and save",
                        () => void submit(),
                        action === "csv" && !csvPreview,
                      )}
                      {button("Cancel", () => setAction(null))}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
