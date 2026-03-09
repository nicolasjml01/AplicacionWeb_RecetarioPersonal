package backend.recetarioPersonal.model;

/**
 * Domain model: user in memory (later will map to DB).
 * All names in English for consistency across the project.
 */
public class User {
    private long id;
    private String name;
    private String lastName;
    private String username;
    private String email;
    private String password;
    private boolean verified;

    public User(long id, String name, String lastName, String username, String email, String password, boolean verified) {
        this.id = id;
        this.name = name;
        this.lastName = lastName;
        this.username = username;
        this.email = email;
        this.password = password;
        this.verified = verified;
    }

    public User() {
        this.id = 0;
        this.name = "";
        this.lastName = "";
        this.username = "";
        this.email = "";
        this.password = "";
        this.verified = false;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }
}
