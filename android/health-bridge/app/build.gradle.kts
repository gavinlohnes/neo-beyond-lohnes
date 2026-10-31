plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "app.beyond.healthbridge"
    compileSdk = 36
    defaultConfig {
        applicationId = "app.beyond.healthbridge"
        minSdk = 28
        targetSdk = 35
        versionCode = 10
        versionName = "0.9.0"
    }
    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
