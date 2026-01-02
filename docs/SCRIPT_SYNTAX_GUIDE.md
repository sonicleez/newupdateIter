# 📝 Script Syntax Guide
## Cú pháp viết Script để AI phân biệt Voice Over và Dialogue

Khi import script vào Manual Script Modal, AI sẽ tự động phân tích và tách **Voice Over (VO)** khỏi **Dialogue (Lời thoại)**.

---

## 🎙️ Voice Over (Narration)

Voice Over là lời bình/thuyết minh được đọc bởi narrator **ngoài cảnh** (off-screen).

### Cách viết:
Viết text thuần, không có dấu hiệu đặc biệt:

```
Monte Carlo, March 2019. 11:47 p.m. A man in a charcoal suit stands at the edge of a roulette table.

Security footage will later show he won 14 consecutive bets that night.

The man cashes out 847,000 euros. Tips the dealer 500. Walks to the lobby.
```

**→ AI hiểu đây là Voice Over** (narrator đọc, không có ai nói trong cảnh)

---

## 💬 Dialogue (Lời thoại nhân vật)

Dialogue là lời thoại được nói bởi nhân vật **trong cảnh** (on-screen).

### Format A: Tên + Dấu hai chấm ✅ (Khuyên dùng)

```
Officer: Badge. Monegasque police. Monsieur, we need to speak with you.

Marchand: Of course, officer. How may I help you?
```

### Format B: Dấu ngoặc kép

```
"Badge. Monegasque police. Monsieur, we need to speak with you."

"Of course, officer. How may I help you?"
```

> ⚠️ Với format này, AI có thể không xác định được ai đang nói (speaker unknown)

### Format C: Kết hợp Narrator + Dialogue

```
The officer stepped forward and said, "Badge. Monegasque police."

Marchand turned slowly. "Is there a problem?"
```

### Format D: Screenplay style

```
OFFICER
Badge. Monegasque police. Monsieur, we need to speak with you.

MARCHAND
Of course. How may I help you?
```

---

## 🔀 Kết hợp VO + Dialogue

Một script có thể chứa cả VO và Dialogue xen kẽ:

```
Two plainclothes officers intercept him near the coat check.

Officer: "Badge. Monegasque police. Monsieur, we need to speak with you regarding your activities this evening."

The man doesn't run. Doesn't argue. He reaches slowly into his jacket.

Marchand: "Of course, gentlemen. How may I assist you?"

Everything checks. Clean record. No flags in the system. They have no grounds to hold him.
```

### AI sẽ tách thành:

| Scene | Voice Over | Dialogue |
|-------|------------|----------|
| 1 | Two plainclothes officers intercept him near the coat check. | - |
| 2 | - | Officer: Badge. Monegasque police... |
| 3 | The man doesn't run. Doesn't argue. He reaches slowly into his jacket. | - |
| 4 | - | Marchand: Of course, gentlemen... |
| 5 | Everything checks. Clean record... | - |

---

## 📊 Bảng tóm tắt Format

| Format | Ví dụ | AI hiểu là | Speaker |
|--------|-------|------------|---------|
| Text thuần | `The man walks away.` | Voice Over | Narrator |
| `Tên: Text` | `John: Hello there.` | Dialogue | John |
| `TÊN VIẾT HOA` (dòng riêng) | `JOHN\nHello there.` | Dialogue | John |
| `"Text"` | `"Hello there."` | Dialogue | Unknown |
| Text + `"Text"` | `He said, "Hello."` | VO + Dialogue | Narrator + Character |

---

## ⚠️ Tips để AI nhận diện tốt hơn

### 1. Dùng tên nhất quán
```
❌ Officer → Cop → Police → Guard (nhầm lẫn)
✅ Officer → Officer → Officer (rõ ràng)
```

### 2. Dialogue ngắn = tốt hơn
```
❌ John: Hello there my friend, how are you doing today, I've been meaning to ask you about...

✅ John: Hello there, my friend.
John: How are you doing today?
John: I've been meaning to ask you something.
```

### 3. Dấu ngoặc kép rõ ràng
```
❌ «Hello» hoặc 'Hello' hoặc „Hello"
✅ "Hello"
```

### 4. Một dòng = Một ý
Giúp AI tách scene chính xác:
```
❌ The man walks into the casino, sits down at the table, places his bet, and watches the wheel spin.

✅ The man walks into the casino.
He sits down at the table.
He places his bet.
He watches the wheel spin.
```

### 5. Tách VO và Dialogue rõ ràng với dòng trống
```
The officers approach him cautiously.

Officer: Badge. Monegasque police.

He doesn't move. His expression remains unchanged.

Marchand: Is there a problem, gentlemen?
```

---

## 🎬 Kết quả trong Veo Prompt

Khi generate Veo prompt, AI sẽ sử dụng:

- **Voice Over** → `Voice Over/Narration: "..."` 
  - Dùng cho audio track narrator (off-screen)
  
- **Dialogue** → `Character Dialogue (Language): "Speaker: ..."`
  - Dùng cho lip-sync animation của nhân vật (on-screen)

---

## 📁 Ví dụ Script hoàn chỉnh

```
# CASINO HEIST - CHAPTER 1

Monte Carlo, March 2019. 11:47 p.m. The grand hall of Casino de Monte-Carlo gleams under crystal chandeliers.

A man in a charcoal suit stands at the edge of a roulette table. His name is Étienne Marchand. Though tonight, his passport says otherwise.

Dealer: Place your bets, please.

Marchand places a 5,000 euro chip on the second dozen. His face betrays nothing.

The croupier spins. The ball rattles. Lands on 23.

Security footage will later show he won 14 consecutive bets that night. Statistical probability: one in 4.7 million.

Pit Boss: (into radio) Table 7. European male. Hot streak. Get eyes on him.

Marchand: I believe I'll cash out now.

He gathers his chips with practiced calm. 847,000 euros. Tips the dealer 500.

The night is young. And Étienne Marchand has been planning this for 11 years.
```

**→ AI sẽ tự động tách thành nhiều scenes với VO và Dialogue riêng biệt!**

---

*Last Updated: January 2026*
