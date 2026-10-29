# kotlinx.serialization keeps its own generated serializers; nothing app-specific to add.
-keepclassmembers class com.worktime.wear.data.** {
    *** Companion;
}
-keep,includedescriptorclasses class com.worktime.wear.data.**$$serializer { *; }
