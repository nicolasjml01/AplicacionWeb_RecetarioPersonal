package backend.recetarioPersonal.recipeimport;

import backend.recetarioPersonal.exception.RecipeImportException;
import java.io.IOException;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

/**
 * Downloads HTML from a public recipe page.
 */
@Component
public class PageFetcher {

    private static final String USER_AGENT = "RecetarioPersonal/1.0 (+recipe-import-preview)";
    private static final int TIMEOUT_MS = 15_000;
    private static final int MAX_BODY_BYTES = 3_000_000;

    public String fetch(String url) {
        try {
            Connection connection = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(TIMEOUT_MS)
                    .followRedirects(true)
                    .ignoreContentType(true)
                    .maxBodySize(MAX_BODY_BYTES);

            Document document = connection.get();
            return document.html();
        } catch (IOException ex) {
            throw new RecipeImportException(
                    "No se pudo acceder a la página. Comprueba el enlace o inténtalo más tarde.",
                    ex);
        }
    }
}