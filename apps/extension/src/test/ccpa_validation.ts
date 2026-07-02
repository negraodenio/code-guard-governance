
// Arquivo de Teste de Conformidade da Califórnia (CCPA/CPRA)

export class UserProfile {
    // VIOLATION: SSN storage
    // CCPA considera SSN como dado altamente sensível
    public user_ssn: string = "xxx-xx-xxxx";

    public name: string = "John Doe";
    public email: string = "john.doe@example.com";

    constructor() {
        // Test data initialized in properties
    }

    // VIOLATION: Data Selling Indicator
    public shareDataWithAdNetwork() {
        const sell_data = true;
        if (sell_data) {
            console.log("Sharing data with 3rd party brokers...");
        }
    }

    // VIOLATION: Precise Geolocation (CPRA)
    public trackUserLocation() {
        const latitude = 34.0522;
        const longitude = -118.2437;
        const gps_tracking_enabled = true;
    }

    // VIOLATION: Biometrics
    public enableFaceId() {
        const face_id_token = "biometric_hash_123";
    }
}
