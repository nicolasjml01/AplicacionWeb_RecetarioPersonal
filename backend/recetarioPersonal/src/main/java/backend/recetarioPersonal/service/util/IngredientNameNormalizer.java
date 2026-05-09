package backend.recetarioPersonal.service.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/**
 * Convert plural to singular form for the dedup key.
 */
public final class IngredientNameNormalizer {

    private static final Set<String> STOPWORDS = Set.of(
            "de", "del", "con", "en", "a", "al", "y", "sin", "para"
    );

    private IngredientNameNormalizer() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String base = stripAccentsLower(raw.trim());
        if (base.isEmpty()) {
            return "";
        }
        String[] tokens = base.split("\\s+");
        StringBuilder out = new StringBuilder();
        for (String token : tokens) {
            if (token.isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(' ');
            }
            if (STOPWORDS.contains(token)) {
                out.append(token);
            } else {
                out.append(singularize(token));
            }
        }
        return out.toString();
    }

    private static String stripAccentsLower(String s) {
        String lower = s.toLowerCase(Locale.ROOT);
        String nfd = Normalizer.normalize(lower, Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{M}+", "");
    }

    private static String singularize(String w) {
        if (w.length() <= 3) {
            return w;
        }
        if (w.endsWith("ces")) {
            return w.substring(0, w.length() - 3) + "z";
        }
        if (w.length() >= 4 && w.endsWith("es") && !isVowel(w.charAt(w.length() - 3))) {
            return w.substring(0, w.length() - 2);
        }
        if (w.endsWith("s") && isVowel(w.charAt(w.length() - 2))) {
            return w.substring(0, w.length() - 1);
        }
        return w;
    }

    private static boolean isVowel(char c) {
        return c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u';
    }
}